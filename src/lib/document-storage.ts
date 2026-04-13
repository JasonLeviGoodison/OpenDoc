const STORAGE_BUCKET = 'documents';
const LEGACY_PUBLIC_PATH_PREFIX = `/storage/v1/object/public/${STORAGE_BUCKET}/`;

function hasInvalidPathSegment(segment: string) {
  return !segment || segment === '.' || segment === '..';
}

export function isStorageObjectPath(fileUrl: string) {
  if (
    !fileUrl ||
    /^https?:\/\//i.test(fileUrl) ||
    fileUrl.startsWith('/') ||
    fileUrl.includes('\\') ||
    fileUrl.includes('?') ||
    fileUrl.includes('#')
  ) {
    return false;
  }

  const segments = fileUrl.split('/');

  if (segments.length < 2 || segments.some(hasInvalidPathSegment)) {
    return false;
  }

  return true;
}

export function isAllowedLegacyPublicStorageUrl(
  fileUrl: string,
  supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
) {
  if (!supabaseOrigin) {
    return false;
  }

  let allowedOrigin: URL;
  let candidateUrl: URL;

  try {
    allowedOrigin = new URL(supabaseOrigin);
    candidateUrl = new URL(fileUrl);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(candidateUrl.protocol)) {
    return false;
  }

  if (candidateUrl.origin !== allowedOrigin.origin) {
    return false;
  }

  if (!candidateUrl.pathname.startsWith(LEGACY_PUBLIC_PATH_PREFIX)) {
    return false;
  }

  const objectPath = decodeURIComponent(candidateUrl.pathname.slice(LEGACY_PUBLIC_PATH_PREFIX.length));
  return isStorageObjectPath(objectPath);
}

export function isAcceptedStoredFileUrl(
  fileUrl: string,
  supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
) {
  return isStorageObjectPath(fileUrl) || isAllowedLegacyPublicStorageUrl(fileUrl, supabaseOrigin);
}
