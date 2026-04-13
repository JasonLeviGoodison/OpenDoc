import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { supabase } from '@/lib/supabase';
import { serializeDocument } from '@/lib/serializers';
import { ensureCurrentUserRecord, requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';
import { createStoragePath } from '@/lib/storage';
import { getFileExtension } from '@/lib/utils';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx']);
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await ensureCurrentUserRecord(userId);

    const formData = await req.formData();
    const file = formData.get('file');
    const rawName = formData.get('name');

    if (!(file instanceof File)) {
      throw new RouteError('No file provided.', 400);
    }

    const fileExt = getFileExtension(file.name);

    if (!ALLOWED_EXTENSIONS.has(fileExt)) {
      throw new RouteError('Unsupported file type.', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new RouteError('File is too large.', 400);
    }

    const filePath = createStoragePath(userId, file.name);

    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

    if (uploadError) {
      throw new RouteError(uploadError.message, 500);
    }

    const [row] = await db
      .insert(documents)
      .values({
        fileSize: file.size,
        fileType: fileExt,
        fileUrl: filePath,
        name: typeof rawName === 'string' && rawName.trim()
          ? rawName.trim()
          : file.name.replace(/\.[^/.]+$/, ''),
        originalFilename: file.name,
        pageCount: 1,
        userId,
      })
      .returning();

    return NextResponse.json(serializeDocument(row), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
