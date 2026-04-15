import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { serializeDocument } from '@/lib/serializers';
import { requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { parseDocumentPatchBody, ValidationError } from '@/lib/validators';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const [row] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));

    if (!row) {
      throw new RouteError('Not found', 404);
    }

    return NextResponse.json(serializeDocument(row));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const updates = parseDocumentPatchBody(await req.json());

    if (updates.name === null) {
      throw new ValidationError('name cannot be empty.');
    }

    if (Object.keys(updates).length === 0) {
      throw new RouteError('No fields to update.', 400);
    }

    const [row] = await db
      .update(documents)
      .set({
        ...(updates.folderId !== undefined ? { folderId: updates.folderId } : {}),
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .returning();

    if (!row) {
      throw new RouteError('Not found', 404);
    }

    return NextResponse.json(serializeDocument(row));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const [row] = await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .returning();

    if (!row) {
      throw new RouteError('Not found', 404);
    }

    // Clean up files from storage
    const objectPaths = [row.fileUrl, row.previewFileUrl].filter(
      (p): p is string => Boolean(p),
    );

    if (objectPaths.length > 0) {
      const { error } = await getSupabaseAdmin().storage.from('documents').remove(objectPaths);
      if (error) {
        console.error('Failed to clean up storage for deleted document', {
          documentId: id,
          error: error.message,
          objectPaths,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
