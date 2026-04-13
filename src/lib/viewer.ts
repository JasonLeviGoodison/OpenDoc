const PDF_FILE_TYPES = new Set(['pdf']);
const SPREADSHEET_FILE_TYPES = new Set(['csv', 'xls', 'xlsx']);
const PRESENTATION_FILE_TYPES = new Set(['ppt', 'pptx']);
const RICH_DOCUMENT_FILE_TYPES = new Set(['doc', 'docx']);
const TRACKABLE_PREVIEW_SOURCE_FILE_TYPES = new Set(['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']);
const PREVIEW_PENDING_STALE_MS = 2 * 60_000;

export type ViewerDocumentKind = 'document' | 'pdf' | 'presentation' | 'spreadsheet' | 'unsupported';
export type DocumentPreviewStatus = 'failed' | 'none' | 'pending' | 'ready';

function isStalePendingPreview(previewUpdatedAt: Date | string | null | undefined) {
  if (!previewUpdatedAt) {
    return true;
  }

  const resolvedPreviewUpdatedAt =
    previewUpdatedAt instanceof Date ? previewUpdatedAt.getTime() : new Date(previewUpdatedAt).getTime();

  if (Number.isNaN(resolvedPreviewUpdatedAt)) {
    return true;
  }

  return Date.now() - resolvedPreviewUpdatedAt >= PREVIEW_PENDING_STALE_MS;
}

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

export function isDocumentViewerFile(fileType: string | null | undefined) {
  return RICH_DOCUMENT_FILE_TYPES.has(normalizeViewerFileType(fileType));
}

export function isTrackablePreviewSourceFile(fileType: string | null | undefined) {
  return TRACKABLE_PREVIEW_SOURCE_FILE_TYPES.has(normalizeViewerFileType(fileType));
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

export function getInitialDocumentPreviewState(fileType: string | null | undefined): {
  previewFileType: string | null;
  previewStatus: DocumentPreviewStatus;
} {
  if (isPdfViewerFile(fileType)) {
    return {
      previewFileType: 'pdf',
      previewStatus: 'ready',
    };
  }

  if (isTrackablePreviewSourceFile(fileType)) {
    return {
      previewFileType: 'pdf',
      previewStatus: 'pending',
    };
  }

  return {
    previewFileType: null,
    previewStatus: 'none',
  };
}

export function getResolvedDocumentPreviewState({
  fileType,
  previewFileType,
  previewStatus,
  previewUpdatedAt,
}: {
  fileType: string | null | undefined;
  previewFileType: string | null | undefined;
  previewStatus: DocumentPreviewStatus | string | null | undefined;
  previewUpdatedAt?: Date | string | null | undefined;
}): {
  previewFileType: string | null;
  previewStatus: DocumentPreviewStatus;
} {
  if (isPdfViewerFile(fileType)) {
    return {
      previewFileType: 'pdf',
      previewStatus: 'ready',
    };
  }

  if (previewStatus === 'failed' && isTrackablePreviewSourceFile(fileType)) {
    return {
      previewFileType: 'pdf',
      previewStatus: 'failed',
    };
  }

  if (previewStatus === 'ready' && isPdfViewerFile(previewFileType)) {
    return {
      previewFileType: 'pdf',
      previewStatus: 'ready',
    };
  }

  if (previewStatus === 'pending' && isTrackablePreviewSourceFile(fileType) && isStalePendingPreview(previewUpdatedAt)) {
    return {
      previewFileType: 'pdf',
      previewStatus: 'failed',
    };
  }

  if (isTrackablePreviewSourceFile(fileType)) {
    return {
      previewFileType: 'pdf',
      previewStatus: 'pending',
    };
  }

  return {
    previewFileType: null,
    previewStatus: 'none',
  };
}

export function getInlineViewerFileType({
  fileType,
  previewFileType,
  previewStatus,
  previewUpdatedAt,
}: {
  fileType: string | null | undefined;
  previewFileType: string | null | undefined;
  previewStatus: DocumentPreviewStatus | string | null | undefined;
  previewUpdatedAt?: Date | string | null | undefined;
}) {
  return getResolvedDocumentPreviewState({
    fileType,
    previewFileType,
    previewStatus,
    previewUpdatedAt,
  }).previewStatus === 'ready'
    ? 'pdf'
    : null;
}

export function isInlinePreviewPending({
  fileType,
  previewFileType,
  previewStatus,
  previewUpdatedAt,
}: {
  fileType: string | null | undefined;
  previewFileType?: string | null | undefined;
  previewStatus: DocumentPreviewStatus | string | null | undefined;
  previewUpdatedAt?: Date | string | null | undefined;
}) {
  return (
    getResolvedDocumentPreviewState({
      fileType,
      previewFileType,
      previewStatus,
      previewUpdatedAt,
    }).previewStatus === 'pending'
  );
}

export function isInlinePreviewFailed({
  fileType,
  previewFileType,
  previewStatus,
  previewUpdatedAt,
}: {
  fileType: string | null | undefined;
  previewFileType?: string | null | undefined;
  previewStatus: DocumentPreviewStatus | string | null | undefined;
  previewUpdatedAt?: Date | string | null | undefined;
}) {
  return (
    getResolvedDocumentPreviewState({
      fileType,
      previewFileType,
      previewStatus,
      previewUpdatedAt,
    }).previewStatus === 'failed'
  );
}

export function buildPreviewFilename(originalFilename: string) {
  const withoutExtension = originalFilename.replace(/\.[^./\\]+$/, '');
  return withoutExtension === originalFilename ? `${originalFilename}.pdf` : `${withoutExtension}.pdf`;
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
