const OFFICE_EMBED_FILE_TYPES = new Set(['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']);

export function normalizeViewerFileType(fileType: string | null | undefined) {
  return (fileType ?? '').trim().toLowerCase();
}

export function isPdfViewerFile(fileType: string | null | undefined) {
  return normalizeViewerFileType(fileType) === 'pdf';
}

export function isOfficeEmbedViewerFile(fileType: string | null | undefined) {
  return OFFICE_EMBED_FILE_TYPES.has(normalizeViewerFileType(fileType));
}

export function resolveViewerToken({
  cookieToken,
  headerToken,
  queryToken,
}: {
  cookieToken?: string | null;
  headerToken?: string | null;
  queryToken?: string | null;
}) {
  return cookieToken ?? headerToken ?? queryToken ?? null;
}

export function buildViewerDocumentPath({
  documentId,
  download = false,
  linkId,
  token,
}: {
  documentId: string;
  download?: boolean;
  linkId: string;
  token?: string | null;
}) {
  const params = new URLSearchParams({
    documentId,
  });

  if (download) {
    params.set('download', '1');
  }

  if (token) {
    params.set('token', token);
  }

  return `/api/links/${encodeURIComponent(linkId)}/document?${params.toString()}`;
}

export function buildOfficeEmbedUrl(sourceUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(sourceUrl)}`;
}
