import { isStorageObjectPath } from '@/lib/document-storage';
import { normalizeList, splitList } from '@/lib/link-access';

export class ValidationError extends Error {
  readonly status = 400;
}

type RawRecord = Record<string, unknown>;

function asObject(value: unknown): RawRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('Invalid request body.');
  }

  return value as RawRecord;
}

function optionalString(
  value: unknown,
  fieldName: string,
  options: { maxLength?: number } = {},
) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (options.maxLength && trimmed.length > options.maxLength) {
    throw new ValidationError(`${fieldName} is too long.`);
  }

  return trimmed;
}

function requiredString(
  value: unknown,
  fieldName: string,
  options: { maxLength?: number; minLength?: number } = {},
) {
  const parsed = optionalString(value, fieldName, options);

  if (!parsed) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  if (options.minLength && parsed.length < options.minLength) {
    throw new ValidationError(`${fieldName} is too short.`);
  }

  return parsed;
}

function optionalBoolean(value: unknown, defaultValue = false) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value !== 'boolean') {
    throw new ValidationError('Boolean field is invalid.');
  }

  return value;
}

function optionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${fieldName} must be a number.`);
  }

  return parsed;
}

function optionalDateString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a date string.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${fieldName} is invalid.`);
  }

  return parsed.toISOString();
}

function stringArray(value: unknown, fieldName: string) {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    if (!value.every((item) => typeof item === 'string')) {
      throw new ValidationError(`${fieldName} must contain only strings.`);
    }

    return normalizeList(value);
  }

  if (typeof value === 'string') {
    return splitList(value);
  }

  throw new ValidationError(`${fieldName} must be an array of strings.`);
}

export function parseDocumentCreateBody(body: unknown) {
  const record = asObject(body);
  const fileUrl = requiredString(record.file_url, 'file_url', { maxLength: 512 });

  if (!isStorageObjectPath(fileUrl)) {
    throw new ValidationError('file_url must be a storage object path.');
  }

  return {
    fileSize: optionalNumber(record.file_size, 'file_size') ?? 0,
    fileType: requiredString(record.file_type, 'file_type', { maxLength: 32 }),
    fileUrl,
    folderId: optionalString(record.folder_id, 'folder_id', { maxLength: 64 }),
    name: requiredString(record.name, 'name', { maxLength: 180 }),
    originalFilename: requiredString(record.original_filename, 'original_filename', {
      maxLength: 255,
    }),
    pageCount: optionalNumber(record.page_count, 'page_count') ?? 0,
    thumbnailUrl: optionalString(record.thumbnail_url, 'thumbnail_url', { maxLength: 512 }),
  };
}

export function parseDocumentPatchBody(body: unknown) {
  const record = asObject(body);
  const updates: {
    folderId?: string | null;
    name?: string | null;
  } = {};

  if ('folder_id' in record) {
    updates.folderId = optionalString(record.folder_id, 'folder_id', { maxLength: 64 });
  }

  if ('name' in record) {
    updates.name = optionalString(record.name, 'name', { maxLength: 180 });
  }

  return updates;
}

export function parseUploadRequestBody(body: unknown) {
  const record = asObject(body);

  return {
    contentType: optionalString(record.content_type, 'content_type', { maxLength: 160 }),
    fileName: requiredString(record.file_name, 'file_name', { maxLength: 255 }),
    fileSize: optionalNumber(record.file_size, 'file_size') ?? 0,
  };
}

export function parseSpaceCreateBody(body: unknown) {
  const record = asObject(body);

  return {
    bannerUrl: optionalString(record.banner_url, 'banner_url', { maxLength: 512 }),
    description: optionalString(record.description, 'description', { maxLength: 500 }),
    headline: optionalString(record.headline, 'headline', { maxLength: 200 }),
    logoUrl: optionalString(record.logo_url, 'logo_url', { maxLength: 512 }),
    name: requiredString(record.name, 'name', { maxLength: 160 }),
  };
}

export function parseShareLinkBody(body: unknown) {
  const record = asObject(body);
  const requirePassword = optionalBoolean(record.require_password, false);
  const requireNda = optionalBoolean(record.require_nda, false);
  const password = optionalString(record.password, 'password', { maxLength: 128 });
  const documentId = optionalString(record.document_id, 'document_id', { maxLength: 64 });
  const spaceId = optionalString(record.space_id, 'space_id', { maxLength: 64 });

  if (!documentId && !spaceId) {
    throw new ValidationError('A document or a space is required.');
  }

  if (documentId && spaceId) {
    throw new ValidationError('A share link can target either a document or a space, not both.');
  }

  if (requirePassword && (!password || password.length < 8)) {
    throw new ValidationError('Passwords must be at least 8 characters long.');
  }

  const ndaText = optionalString(record.nda_text, 'nda_text', { maxLength: 5000 });

  if (requireNda && !ndaText) {
    throw new ValidationError('NDA text is required when NDA gating is enabled.');
  }

  return {
    allowDownload: optionalBoolean(record.allow_download, false),
    allowedDomains: stringArray(record.allowed_domains, 'allowed_domains'),
    allowedEmails: stringArray(record.allowed_emails, 'allowed_emails'),
    blockedDomains: stringArray(record.blocked_domains, 'blocked_domains'),
    blockedEmails: stringArray(record.blocked_emails, 'blocked_emails'),
    documentId,
    enableWatermark: optionalBoolean(record.enable_watermark, false),
    expiresAt: optionalDateString(record.expires_at, 'expires_at'),
    name: optionalString(record.name, 'name', { maxLength: 120 }) ?? 'Default Link',
    ndaText,
    password,
    requireEmail: optionalBoolean(record.require_email, true),
    requireNda,
    requirePassword,
    spaceId,
    watermarkText: optionalString(record.watermark_text, 'watermark_text', { maxLength: 120 }),
  };
}

export function parseBrandSettingsBody(body: unknown) {
  const record = asObject(body);

  return {
    accentColor: optionalString(record.accent_color, 'accent_color', { maxLength: 24 }) ?? '#c49a4a',
    companyName: optionalString(record.company_name, 'company_name', { maxLength: 120 }),
    logoUrl: optionalString(record.logo_url, 'logo_url', { maxLength: 512 }),
    websiteUrl: optionalString(record.website_url, 'website_url', { maxLength: 512 }),
  };
}

export function parseVisitCreateBody(body: unknown) {
  const record = asObject(body);

  return {
    documentId: optionalString(record.document_id, 'document_id', { maxLength: 64 }),
    ndaAccepted: optionalBoolean(record.nda_accepted, false),
    visitorEmail: optionalString(record.visitor_email, 'visitor_email', { maxLength: 320 }),
    visitorName: optionalString(record.visitor_name, 'visitor_name', { maxLength: 120 }),
  };
}

export function parseVisitPatchBody(body: unknown) {
  const record = asObject(body);
  const updates: {
    completionRate?: number | null;
    downloaded?: boolean;
    duration?: number | null;
    pageCountViewed?: number | null;
  } = {};

  if ('completion_rate' in record) {
    updates.completionRate = optionalNumber(record.completion_rate, 'completion_rate');
  }

  if ('downloaded' in record) {
    updates.downloaded = optionalBoolean(record.downloaded);
  }

  if ('duration' in record) {
    updates.duration = optionalNumber(record.duration, 'duration');
  }

  if ('page_count_viewed' in record) {
    updates.pageCountViewed = optionalNumber(record.page_count_viewed, 'page_count_viewed');
  }

  return updates;
}

export function parsePageViewBody(body: unknown) {
  const record = asObject(body);
  const pageNumber = optionalNumber(record.page_number, 'page_number');
  const duration = optionalNumber(record.duration, 'duration') ?? 0;

  if (!pageNumber || pageNumber < 1) {
    throw new ValidationError('page_number must be a positive integer.');
  }

  if (duration < 0) {
    throw new ValidationError('duration must be zero or greater.');
  }

  return {
    documentId: requiredString(record.document_id, 'document_id', { maxLength: 64 }),
    duration,
    pageNumber,
    visitId: requiredString(record.visit_id, 'visit_id', { maxLength: 64 }),
  };
}
