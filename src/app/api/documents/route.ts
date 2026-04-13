import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { serializeDocument } from '@/lib/serializers';
import { ensureCurrentUserRecord, requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';
import { ensureDocumentPreview } from '@/lib/server/document-preview';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createPreviewStoragePath } from '@/lib/storage';
import { parseDocumentCreateBody } from '@/lib/validators';
import { getInitialDocumentPreviewState } from '@/lib/viewer';

export const maxDuration = 300;

async function rollbackDocumentUpload(documentId: string, objectPaths: Array<string | null | undefined>) {
  const uniqueObjectPaths = [...new Set(objectPaths.filter((value): value is string => Boolean(value)))];

  if (uniqueObjectPaths.length > 0) {
    const { error } = await getSupabaseAdmin().storage.from('documents').remove(uniqueObjectPaths);

    if (error) {
      console.error('Failed to clean up document upload objects', {
        documentId,
        error: error.message,
        objectPaths: uniqueObjectPaths,
      });
    }
  }

  await db.delete(documents).where(eq(documents.id, documentId));
}

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

    const previewPath = createPreviewStoragePath(userId, row.id);

    try {
      await ensureDocumentPreview(row.id);

      const [refreshedRow] = await db.select().from(documents).where(eq(documents.id, row.id));

      if (!refreshedRow) {
        throw new RouteError('Document upload could not be finalized.', 500);
      }

      if (refreshedRow.previewStatus === 'failed') {
        throw new RouteError(refreshedRow.previewError || 'Document preview generation failed.', 500);
      }

      return NextResponse.json(serializeDocument(refreshedRow), { status: 201 });
    } catch (error) {
      await rollbackDocumentUpload(row.id, [row.fileUrl, previewPath]);
      throw error;
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
