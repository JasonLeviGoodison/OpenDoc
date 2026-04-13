import { clsx, type ClassValue } from 'clsx';
import { customAlphabet } from 'nanoid';
import { twMerge } from 'tailwind-merge';

const secureLinkId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function generateLinkId(length = 10) {
  if (length === 10) {
    return secureLinkId();
  }

  return customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', length)();
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getFileExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function getFileIcon(filename: string) {
  const ext = getFileExtension(filename);
  switch (ext) {
    case 'pdf': return 'file-text';
    case 'doc':
    case 'docx': return 'file-text';
    case 'ppt':
    case 'pptx': return 'presentation';
    case 'xls':
    case 'xlsx':
    case 'csv': return 'sheet';
    case 'mp4':
    case 'mov':
    case 'avi': return 'video';
    case 'mp3':
    case 'wav': return 'audio-lines';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return 'image';
    default: return 'file';
  }
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
