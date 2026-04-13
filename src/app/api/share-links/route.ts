import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { documentLinks, documents, spaces } from '@/db/schema';
import { serializeDocumentLink } from '@/lib/serializers';
import {
  ensureCurrentUserRecord,
  requireUserId,
  RouteError,
  toErrorResponse,
} from '@/lib/server/auth';
import { hashPassword } from '@/lib/security';
import { generateLinkId } from '@/lib/utils';
import { parseShareLinkBody } from '@/lib/validators';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const documentId = req.nextUrl.searchParams.get('documentId');
    const spaceId = req.nextUrl.searchParams.get('spaceId');
    const filters = [eq(documentLinks.userId, userId)];

    if (documentId) {
      filters.push(eq(documentLinks.documentId, documentId));
    }

    if (spaceId) {
      filters.push(eq(documentLinks.spaceId, spaceId));
    }

    const rows = await db
      .select({
        documentName: documents.name,
        link: documentLinks,
        spaceName: spaces.name,
      })
      .from(documentLinks)
      .leftJoin(documents, eq(documentLinks.documentId, documents.id))
      .leftJoin(spaces, eq(documentLinks.spaceId, spaces.id))
      .where(and(...filters))
      .orderBy(desc(documentLinks.createdAt));

    return NextResponse.json(
      rows.map(({ documentName, link, spaceName }) =>
        serializeDocumentLink(link, {
          document_name: documentName,
          space_name: spaceName,
        }),
      ),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await ensureCurrentUserRecord(userId);

    const body = parseShareLinkBody(await req.json());

    if (body.documentId) {
      const [document] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.id, body.documentId), eq(documents.userId, userId)));

      if (!document) {
        throw new RouteError('Document not found.', 404);
      }
    }

    if (body.spaceId) {
      const [space] = await db
        .select({ id: spaces.id })
        .from(spaces)
        .where(and(eq(spaces.id, body.spaceId), eq(spaces.userId, userId)));

      if (!space) {
        throw new RouteError('Space not found.', 404);
      }
    }

    const [row] = await db
      .insert(documentLinks)
      .values({
        allowDownload: body.allowDownload,
        allowedDomains: body.allowedDomains,
        allowedEmails: body.allowedEmails,
        blockedDomains: body.blockedDomains,
        blockedEmails: body.blockedEmails,
        documentId: body.documentId,
        enableWatermark: body.enableWatermark,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        linkId: generateLinkId(),
        name: body.name,
        ndaText: body.ndaText,
        passwordHash: body.requirePassword && body.password ? hashPassword(body.password) : null,
        requireEmail: body.requireEmail,
        requireNda: body.requireNda,
        requirePassword: body.requirePassword,
        spaceId: body.spaceId,
        userId,
        watermarkText: body.watermarkText,
      })
      .returning();

    return NextResponse.json(serializeDocumentLink(row), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
