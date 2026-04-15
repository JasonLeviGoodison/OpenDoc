import { after, NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documentLinks, documents, notifications, signatures, spaceDocuments, users, visits } from '@/db/schema';
import { and, desc, eq, gte, isNull, ne, sql } from 'drizzle-orm';
import { getLinkAvailability, isEmailAuthorized, normalizeEmail } from '@/lib/link-access';
import { serializeVisit } from '@/lib/serializers';
import { sendDocumentViewedEmail } from '@/lib/server/email';
import { requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';
import { createSignedToken, verifySignedToken } from '@/lib/security';
import { parseVisitCreateBody } from '@/lib/validators';

function parseBrowser(ua: string): string {
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Other';
}

function parseOS(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad/i.test(ua)) return 'iOS';
  return 'Other';
}

const DOCUMENT_VIEW_EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000;

interface DocumentViewedNotificationJob {
  analyticsUrl: string;
  documentId: string | null;
  ipAddress: string | null;
  linkName: string;
  viewedAt: Date;
  viewerEmail: string | null;
  visitId: string;
}

async function sendDocumentViewedNotification(job: DocumentViewedNotificationJob) {
  if (!job.documentId) {
    return;
  }

  const [documentOwner] = await db
    .select({
      documentName: documents.name,
      ownerEmail: users.email,
      ownerName: users.fullName,
    })
    .from(documents)
    .innerJoin(users, eq(documents.userId, users.id))
    .where(eq(documents.id, job.documentId))
    .limit(1);

  if (!documentOwner?.ownerEmail) {
    return;
  }

  const normalizedOwnerEmail = normalizeEmail(documentOwner.ownerEmail);
  const normalizedViewerEmail = job.viewerEmail ? normalizeEmail(job.viewerEmail) : null;

  if (normalizedViewerEmail && normalizedViewerEmail === normalizedOwnerEmail) {
    return;
  }

  const anonymousVisitorFilter =
    job.ipAddress && job.ipAddress !== 'unknown'
      ? and(isNull(visits.visitorEmail), eq(visits.ipAddress, job.ipAddress))
      : isNull(visits.visitorEmail);
  const visitorFilter = normalizedViewerEmail
    ? sql`lower(${visits.visitorEmail}) = ${normalizedViewerEmail}`
    : anonymousVisitorFilter;
  const windowStart = new Date(job.viewedAt.getTime() - DOCUMENT_VIEW_EMAIL_WINDOW_MS);

  const [recentVisit] = await db
    .select({ id: visits.id })
    .from(visits)
    .where(
      and(
        eq(visits.documentId, job.documentId),
        gte(visits.createdAt, windowStart),
        ne(visits.id, job.visitId),
        visitorFilter,
      ),
    )
    .limit(1);

  if (recentVisit) {
    return;
  }

  await sendDocumentViewedEmail({
    analyticsUrl: job.analyticsUrl,
    documentName: documentOwner.documentName,
    linkName: job.linkName,
    ownerEmail: documentOwner.ownerEmail,
    ownerName: documentOwner.ownerName,
    viewedAt: job.viewedAt,
    viewerEmail: job.viewerEmail,
  });
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const documentId = req.nextUrl.searchParams.get('documentId');
    const rawLimit = Number(req.nextUrl.searchParams.get('limit'));
    const rawRangeDays = Number(req.nextUrl.searchParams.get('rangeDays'));
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : null;
    const rangeDays = Number.isInteger(rawRangeDays) && rawRangeDays > 0 ? rawRangeDays : null;
    const filters = [eq(documentLinks.userId, userId)];

    if (documentId) {
      filters.push(eq(visits.documentId, documentId));
    }

    if (rangeDays) {
      const since = new Date();
      since.setDate(since.getDate() - rangeDays);
      filters.push(gte(visits.createdAt, since));
    }

    const baseQuery = db
      .select({ visit: visits })
      .from(visits)
      .innerJoin(documentLinks, eq(visits.linkId, documentLinks.id))
      .where(and(...filters))
      .orderBy(desc(visits.createdAt));
    const rows = limit ? await baseQuery.limit(limit) : await baseQuery;
    return NextResponse.json(rows.map(({ visit }) => serializeVisit(visit)));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const viewerToken = req.headers.get('x-opendoc-viewer-token');
    const tokenPayload = verifySignedToken(viewerToken);

    if (!tokenPayload || tokenPayload.scope !== 'viewer') {
      throw new RouteError('Viewer session is invalid.', 401);
    }

    const body = parseVisitCreateBody(await req.json());
    const [link] = await db
      .select()
      .from(documentLinks)
      .where(eq(documentLinks.linkId, tokenPayload.linkId));

    if (!link) {
      throw new RouteError('Link not found.', 404);
    }

    if (getLinkAvailability(link) !== 'available') {
      throw new RouteError('Link is not available.', 403);
    }

    if (link.requireEmail && (!body.visitorEmail || !isEmailAuthorized(link, body.visitorEmail))) {
      throw new RouteError('Viewer email is not authorized.', 403);
    }

    if (link.requireNda && !body.ndaAccepted) {
      throw new RouteError('NDA acceptance is required.', 403);
    }

    let documentId = link.documentId;

    if (link.spaceId) {
      if (body.documentId) {
        const [spaceDocument] = await db
          .select({ documentId: spaceDocuments.documentId })
          .from(spaceDocuments)
          .where(and(eq(spaceDocuments.spaceId, link.spaceId), eq(spaceDocuments.documentId, body.documentId)));

        if (!spaceDocument) {
          throw new RouteError('Document is not part of this space.', 400);
        }

        documentId = spaceDocument.documentId;
      } else {
        const [spaceDocument] = await db
          .select({ documentId: spaceDocuments.documentId })
          .from(spaceDocuments)
          .where(eq(spaceDocuments.spaceId, link.spaceId))
          .orderBy(spaceDocuments.orderIndex);

        documentId = spaceDocument?.documentId ?? null;
      }
    } else if (body.documentId && body.documentId !== link.documentId) {
      throw new RouteError('Document is not associated with this link.', 400);
    }

    const [document] = documentId
      ? await db
          .select({
            id: documents.id,
            name: documents.name,
            userId: documents.userId,
          })
          .from(documents)
          .where(eq(documents.id, documentId))
      : [];

    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0]?.trim() : req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
    const browser = parseBrowser(userAgent);
    const os = parseOS(userAgent);

    const [row] = await db
      .insert(visits)
      .values({
        browser,
        deviceType: isMobile ? 'Mobile' : 'Desktop',
        documentId,
        ipAddress: ip || 'unknown',
        linkId: link.id,
        os,
        visitorEmail: body.visitorEmail,
        visitorName: body.visitorName,
      })
      .returning();

    if (link.requireNda) {
      await db.insert(signatures).values({
        linkId: link.id,
        ndaText: link.ndaText ?? '',
        signerEmail: body.visitorEmail ?? `anonymous+${row.id}@opendoc.invalid`,
        signerIp: ip || 'unknown',
        signerName: body.visitorName ?? body.visitorEmail ?? 'Anonymous viewer',
        visitId: row.id,
      });

      await db.update(visits).set({ signedNda: true }).where(eq(visits.id, row.id));
    }

    await db
      .update(documentLinks)
      .set({
        lastVisitedAt: new Date(),
        visitCount: sql`${documentLinks.visitCount} + 1`,
      })
      .where(eq(documentLinks.id, link.id));

    if (documentId) {
      const viewerLabel = body.visitorEmail?.trim() || body.visitorName?.trim() || 'Someone';
      const documentName = document?.name ?? 'your document';
      const notificationUserId = document?.userId ?? link.userId;

      await db.insert(notifications).values({
        message: `${viewerLabel} viewed "${documentName}"`,
        metadata: {
          documentId,
          documentName,
          linkId: link.linkId,
          linkRecordId: link.id,
          visitId: row.id,
          visitorEmail: body.visitorEmail ?? null,
          visitorName: body.visitorName ?? null,
        },
        title: 'Someone viewed your document',
        type: 'document_viewed',
        userId: notificationUserId,
      });
    }

    after(async () => {
      try {
        await sendDocumentViewedNotification({
          analyticsUrl: documentId ? `${req.nextUrl.origin}/documents/${documentId}` : req.nextUrl.origin,
          documentId,
          ipAddress: ip || 'unknown',
          linkName: link.name,
          viewedAt: row.createdAt ?? new Date(),
          viewerEmail: body.visitorEmail,
          visitId: row.id,
        });
      } catch (error) {
        console.error('Failed to send document view email notification:', error);
      }
    });

    return NextResponse.json(
      {
        ...serializeVisit(row),
        visit_token: createSignedToken({
          linkId: tokenPayload.linkId,
          scope: 'visit',
          visitId: row.id,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
