import { randomUUID } from 'node:crypto';

import { supabase } from '@/lib/supabase';
import { getFileExtension } from '@/lib/utils';

export function createStoragePath(userId: string, filename: string) {
  const extension = getFileExtension(filename) || 'bin';
  return `${userId}/${randomUUID()}.${extension}`;
}

export function resolveStoredFileUrl(fileUrl: string) {
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  const { data } = supabase.storage.from('documents').getPublicUrl(fileUrl);
  return data.publicUrl;
}
