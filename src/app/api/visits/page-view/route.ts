import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pageViews } from '@/db/schema';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const [row] = await db
    .insert(pageViews)
    .values({
      visitId: body.visit_id,
      documentId: body.document_id,
      pageNumber: body.page_number,
      duration: body.duration || 0,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
