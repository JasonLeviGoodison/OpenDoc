import { randomUUID } from 'node:crypto';

import { isAllowedLegacyPublicStorageUrl, isStorageObjectPath } from '@/lib/document-storage';
import { supabase } from '@/lib/supabase';
import { getFileExtension } from '@/lib/utils';

export function createStoragePath(userId: string, filename: string) {
  const extension = getFileExtension(filename) || 'bin';
  return `${userId}/${randomUUID()}.${extension}`;
}

export function createPreviewStoragePath(userId: string, documentId: string, extension = 'pdf') {
  return `${userId}/previews/${documentId}.${extension}`;
}

export function resolveStoredFileUrl(fileUrl: string) {
  if (isStorageObjectPath(fileUrl)) {
    const { data } = supabase.storage.from('documents').getPublicUrl(fileUrl);
    return data.publicUrl;
  }

  if (isAllowedLegacyPublicStorageUrl(fileUrl)) {
    return fileUrl;
  }

  throw new Error('Document storage URL is invalid.');
}
