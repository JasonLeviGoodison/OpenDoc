import { after, NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { serializeDocument } from '@/lib/serializers';
import { ensureCurrentUserRecord, requireUserId, toErrorResponse } from '@/lib/server/auth';
import { parseDocumentCreateBody } from '@/lib/validators';
import { getInitialDocumentPreviewState } from '@/lib/viewer';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const rawLimit = Number(req.nextUrl.searchParams.get('limit'));
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : null;

    const baseQuery = db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));
    const rows = limit ? await baseQuery.limit(limit) : await baseQuery;
    return NextResponse.json(rows.map(serializeDocument));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await ensureCurrentUserRecord(userId);

    const body = parseDocumentCreateBody(await req.json());
    const initialPreviewState = getInitialDocumentPreviewState(body.fileType);

    const [row] = await db
      .insert(documents)
      .values({
        fileSize: body.fileSize,
        fileType: body.fileType,
        fileUrl: body.fileUrl,
        folderId: body.folderId,
        name: body.name,
        originalFilename: body.originalFilename,
        pageCount: body.pageCount,
        previewFileType: initialPreviewState.previewFileType,
        previewPageCount: 0,
        previewStatus: initialPreviewState.previewStatus,
        thumbnailUrl: body.thumbnailUrl,
        userId,
      })
      .returning();

    after(async () => {
      try {
        const { ensureDocumentPreview } = await import('@/lib/server/document-preview');
        await ensureDocumentPreview(row.id);
      } catch (previewError) {
        console.error('Failed to generate document preview', previewError);
      }
    });

    return NextResponse.json(serializeDocument(row), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
