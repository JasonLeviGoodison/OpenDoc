const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const FILENAME_FALLBACK = 'document';

export const VIEWER_COOKIE_NAME = 'opendoc_viewer';

function sanitizeFilename(filename: string | null | undefined) {
  const trimmed = typeof filename === 'string' ? filename.trim() : '';
  const cleaned = trimmed
    .replace(CONTROL_CHARS, '')
    .replace(/[\/\\?%*:|<>]/g, '-')
    .replace(/[";]/g, '')
    .trim();

  return cleaned || FILENAME_FALLBACK;
}

function toAsciiFilename(filename: string) {
  const ascii = filename
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[";]/g, '')
    .trim();

  return ascii || FILENAME_FALLBACK;
}

function encodeRfc5987Value(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function buildContentDisposition(
  disposition: 'attachment' | 'inline',
  filename: string | null | undefined,
) {
  const safeFilename = sanitizeFilename(filename);
  const asciiFilename = toAsciiFilename(safeFilename);

  return `${disposition}; filename="${asciiFilename}"; filename*=UTF-8''${encodeRfc5987Value(safeFilename)}`;
}

export function getViewerCookiePath(linkId: string) {
  return `/api/links/${linkId}`;
}
