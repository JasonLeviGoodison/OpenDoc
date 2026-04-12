import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const name = formData.get('name') as string;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const filePath = `${userId}/${Date.now()}-${file.name}`;

  // Upload to Supabase Storage (still used for file hosting)
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  // Insert document via Drizzle
  const [row] = await db
    .insert(documents)
    .values({
      userId,
      name: name || file.name.replace(/\.[^/.]+$/, ''),
      originalFilename: file.name,
      fileUrl: publicUrl,
      fileSize: file.size,
      fileType: fileExt,
      pageCount: 1,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
