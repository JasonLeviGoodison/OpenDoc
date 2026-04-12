import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const [row] = await db
    .insert(documents)
    .values({
      userId,
      name: body.name,
      originalFilename: body.original_filename,
      fileUrl: body.file_url,
      fileSize: body.file_size,
      fileType: body.file_type,
      pageCount: body.page_count || 1,
      thumbnailUrl: body.thumbnail_url || null,
      folderId: body.folder_id || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
