const DEFAULT_MAX_UPLOAD_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function parseMaxUploadFileSizeBytes(value: string | undefined) {
  if (!value) {
    return DEFAULT_MAX_UPLOAD_FILE_SIZE_BYTES;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_MAX_UPLOAD_FILE_SIZE_BYTES;
  }

  return parsed;
}

export const MAX_UPLOAD_FILE_SIZE_BYTES = parseMaxUploadFileSizeBytes(
  process.env.NEXT_PUBLIC_MAX_UPLOAD_FILE_SIZE_BYTES,
);
