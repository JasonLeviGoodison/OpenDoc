const PDF_FILE_TYPES = new Set(['pdf']);
const SPREADSHEET_FILE_TYPES = new Set(['csv', 'xls', 'xlsx']);
const PRESENTATION_FILE_TYPES = new Set(['ppt', 'pptx']);
const RICH_DOCUMENT_FILE_TYPES = new Set(['doc', 'docx']);
const HTML_PRESENTATION_FILE_TYPES = new Set(['pptx']);
const HTML_DOCUMENT_FILE_TYPES = new Set(['docx']);

export type ViewerDocumentKind = 'document' | 'pdf' | 'presentation' | 'spreadsheet' | 'unsupported';

export function normalizeViewerFileType(fileType: string | null | undefined) {
  return (fileType ?? '').trim().toLowerCase();
}

export function isPdfViewerFile(fileType: string | null | undefined) {
  return PDF_FILE_TYPES.has(normalizeViewerFileType(fileType));
}

export function isSpreadsheetViewerFile(fileType: string | null | undefined) {
  return SPREADSHEET_FILE_TYPES.has(normalizeViewerFileType(fileType));
}

export function isPresentationViewerFile(fileType: string | null | undefined) {
  return PRESENTATION_FILE_TYPES.has(normalizeViewerFileType(fileType));
}

export function isRenderablePresentationViewerFile(fileType: string | null | undefined) {
  return HTML_PRESENTATION_FILE_TYPES.has(normalizeViewerFileType(fileType));
}

export function isDocumentViewerFile(fileType: string | null | undefined) {
  return RICH_DOCUMENT_FILE_TYPES.has(normalizeViewerFileType(fileType));
}

export function isRenderableDocumentViewerFile(fileType: string | null | undefined) {
  return HTML_DOCUMENT_FILE_TYPES.has(normalizeViewerFileType(fileType));
}

export function getViewerDocumentKind(fileType: string | null | undefined): ViewerDocumentKind {
  if (isPdfViewerFile(fileType)) {
    return 'pdf';
  }

  if (isSpreadsheetViewerFile(fileType)) {
    return 'spreadsheet';
  }

  if (isPresentationViewerFile(fileType)) {
    return 'presentation';
  }

  if (isDocumentViewerFile(fileType)) {
    return 'document';
  }

  return 'unsupported';
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
