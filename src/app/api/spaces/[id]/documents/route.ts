import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { documents, spaceDocuments, spaces } from '@/db/schema';
import { serializeDocument } from '@/lib/serializers';
import { requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const [space] = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(and(eq(spaces.id, id), eq(spaces.userId, userId)));

    if (!space) {
      throw new RouteError('Space not found.', 404);
    }

    const rows = await db
      .select({
        document: documents,
        orderIndex: spaceDocuments.orderIndex,
        spaceDocumentId: spaceDocuments.id,
      })
      .from(spaceDocuments)
      .innerJoin(documents, eq(spaceDocuments.documentId, documents.id))
      .where(eq(spaceDocuments.spaceId, id))
      .orderBy(asc(spaceDocuments.orderIndex));

    return NextResponse.json(
      rows.map(({ document, orderIndex, spaceDocumentId }) => ({
        ...serializeDocument(document),
        order_index: orderIndex ?? 0,
        space_doc_id: spaceDocumentId,
      })),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await req.json();
    const documentId = typeof body.document_id === 'string' ? body.document_id : '';

    if (!documentId) {
      throw new RouteError('document_id is required.', 400);
    }

    const [space] = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(and(eq(spaces.id, id), eq(spaces.userId, userId)));

    if (!space) {
      throw new RouteError('Space not found.', 404);
    }

    const [document] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

    if (!document) {
      throw new RouteError('Document not found.', 404);
    }

    const [existing] = await db
      .select({ id: spaceDocuments.id })
      .from(spaceDocuments)
      .where(and(eq(spaceDocuments.spaceId, id), eq(spaceDocuments.documentId, documentId)));

    if (existing) {
      throw new RouteError('Document is already in this space.', 409);
    }

    const [latest] = await db
      .select({ orderIndex: spaceDocuments.orderIndex })
      .from(spaceDocuments)
      .where(eq(spaceDocuments.spaceId, id))
      .orderBy(desc(spaceDocuments.orderIndex));

    const [row] = await db
      .insert(spaceDocuments)
      .values({
        documentId,
        orderIndex: (latest?.orderIndex ?? -1) + 1,
        spaceId: id,
      })
      .returning();

    return NextResponse.json(
      {
        document_id: row.documentId,
        id: row.id,
        order_index: row.orderIndex ?? 0,
        space_id: row.spaceId,
      },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
