import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { documentLinks, documents, spaceDocuments } from '@/db/schema';
import { buildContentDisposition, VIEWER_COOKIE_NAME } from '@/lib/http';
import { getLinkAvailability } from '@/lib/link-access';
import { RouteError, toErrorResponse } from '@/lib/server/auth';
import { verifySignedToken } from '@/lib/security';
import { resolveStoredFileUrl } from '@/lib/storage';

export async function GET(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  try {
    const { linkId } = await params;
    const viewerToken =
      req.cookies.get(VIEWER_COOKIE_NAME)?.value ?? req.headers.get('x-opendoc-viewer-token');
    const tokenPayload = verifySignedToken(viewerToken);

    if (!tokenPayload || tokenPayload.scope !== 'viewer' || tokenPayload.linkId !== linkId) {
      throw new RouteError('Viewer session is invalid.', 401);
    }

    const [link] = await db.select().from(documentLinks).where(eq(documentLinks.linkId, linkId));

    if (!link) {
      throw new RouteError('Link not found.', 404);
    }

    if (getLinkAvailability(link) !== 'available') {
      throw new RouteError('Link is not available.', 403);
    }

    const requestedDocumentId = req.nextUrl.searchParams.get('documentId');
    let documentId = link.documentId ?? null;

    if (link.spaceId) {
      if (requestedDocumentId) {
        const [spaceDocument] = await db
          .select({ documentId: spaceDocuments.documentId })
          .from(spaceDocuments)
          .where(and(eq(spaceDocuments.spaceId, link.spaceId), eq(spaceDocuments.documentId, requestedDocumentId)));

        if (!spaceDocument) {
          throw new RouteError('Document is not part of this space.', 404);
        }

        documentId = spaceDocument.documentId;
      } else {
        const [spaceDocument] = await db
          .select({ documentId: spaceDocuments.documentId })
          .from(spaceDocuments)
          .where(eq(spaceDocuments.spaceId, link.spaceId))
          .orderBy(asc(spaceDocuments.orderIndex));

        documentId = spaceDocument?.documentId ?? null;
      }
    } else if (requestedDocumentId && requestedDocumentId !== link.documentId) {
      throw new RouteError('Document is not associated with this link.', 404);
    }

    if (!documentId) {
      throw new RouteError('Document not found.', 404);
    }

    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));

    if (!document) {
      throw new RouteError('Document not found.', 404);
    }

    const downloadRequested = req.nextUrl.searchParams.get('download') === '1';

    if (downloadRequested && !link.allowDownload) {
      throw new RouteError('Downloads are disabled for this link.', 403);
    }

    let sourceUrl: string;

    try {
      sourceUrl = resolveStoredFileUrl(document.fileUrl);
    } catch {
      throw new RouteError('Document storage URL is invalid.', 500);
    }

    const range = req.headers.get('range');
    const upstream = await fetch(sourceUrl, {
      headers: range ? { range } : undefined,
    });

    if (!upstream.ok) {
      throw new RouteError('Unable to load the document.', 502);
    }

    const headers = new Headers();

    for (const headerName of [
      'accept-ranges',
      'content-length',
      'content-range',
      'content-type',
      'etag',
      'last-modified',
    ]) {
      const headerValue = upstream.headers.get(headerName);

      if (headerValue) {
        headers.set(headerName, headerValue);
      }
    }

    headers.set('Cache-Control', 'private, no-store');
    headers.set('Content-Disposition', buildContentDisposition(downloadRequested ? 'attachment' : 'inline', document.originalFilename));

    return new NextResponse(upstream.body, {
      headers,
      status: upstream.status,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
