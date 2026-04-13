import { NextRequest, NextResponse } from 'next/server';
import { ensureCurrentUserRecord, requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createStoragePath } from '@/lib/storage';
import { getFileExtension } from '@/lib/utils';
import { parseUploadRequestBody } from '@/lib/validators';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx']);
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await ensureCurrentUserRecord(userId);

    const body = parseUploadRequestBody(await req.json());
    const fileExt = getFileExtension(body.fileName);

    if (!ALLOWED_EXTENSIONS.has(fileExt)) {
      throw new RouteError('Unsupported file type.', 400);
    }

    if (body.fileSize <= 0) {
      throw new RouteError('File is required.', 400);
    }

    if (body.fileSize > MAX_FILE_SIZE) {
      throw new RouteError('File is too large.', 400);
    }

    const filePath = createStoragePath(userId, body.fileName);
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUploadUrl(filePath, { upsert: false });

    if (uploadError) {
      throw new RouteError(uploadError.message, 500);
    }

    return NextResponse.json({
      content_type: body.contentType,
      file_type: fileExt,
      path: data.path,
      signed_url: data.signedUrl,
      token: data.token,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
