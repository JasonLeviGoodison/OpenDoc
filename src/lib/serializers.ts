import type { InferSelectModel } from 'drizzle-orm';

import {
  brandSettings,
  documentLinks,
  documents,
  notifications,
  signatures,
  spaces,
  visits,
} from '@/db/schema';
import { getResolvedDocumentPreviewState } from '@/lib/viewer';

type BrandSettingsRow = InferSelectModel<typeof brandSettings>;
type DocumentLinkRow = InferSelectModel<typeof documentLinks>;
type DocumentRow = InferSelectModel<typeof documents>;
type NotificationRow = InferSelectModel<typeof notifications>;
type SignatureRow = InferSelectModel<typeof signatures>;
type SpaceRow = InferSelectModel<typeof spaces>;
type VisitRow = InferSelectModel<typeof visits>;

export function serializeDocument(row: DocumentRow) {
  const resolvedPreview = getResolvedDocumentPreviewState({
    fileType: row.fileType,
    previewFileType: row.previewFileType,
    previewStatus: row.previewStatus,
    previewUpdatedAt: row.previewUpdatedAt,
  });

  return {
    created_at: row.createdAt?.toISOString() ?? null,
    file_size: row.fileSize,
    file_type: row.fileType,
    file_url: row.fileUrl,
    folder_id: row.folderId,
    id: row.id,
    name: row.name,
    original_filename: row.originalFilename,
    page_count: row.pageCount,
    preview_error: row.previewError,
    preview_file_type: resolvedPreview.previewFileType,
    preview_file_url: row.previewFileUrl,
    preview_page_count: row.previewPageCount ?? 0,
    preview_status: resolvedPreview.previewStatus,
    preview_updated_at: row.previewUpdatedAt?.toISOString() ?? null,
    thumbnail_url: row.thumbnailUrl,
    updated_at: row.updatedAt?.toISOString() ?? null,
    user_id: row.userId,
  };
}

export function serializeDocumentSummary(row: DocumentRow) {
  const resolvedPreview = getResolvedDocumentPreviewState({
    fileType: row.fileType,
    previewFileType: row.previewFileType,
    previewStatus: row.previewStatus,
    previewUpdatedAt: row.previewUpdatedAt,
  });

  return {
    file_type: row.fileType,
    id: row.id,
    name: row.name,
    page_count: row.pageCount,
    preview_error: row.previewError,
    preview_file_type: resolvedPreview.previewFileType,
    preview_page_count: row.previewPageCount ?? 0,
    preview_status: resolvedPreview.previewStatus,
    preview_updated_at: row.previewUpdatedAt?.toISOString() ?? null,
  };
}

export function serializeSpace(row: SpaceRow) {
  return {
    banner_url: row.bannerUrl,
    created_at: row.createdAt?.toISOString() ?? null,
    description: row.description,
    headline: row.headline,
    id: row.id,
    is_active: row.isActive ?? true,
    logo_url: row.logoUrl,
    name: row.name,
    updated_at: row.updatedAt?.toISOString() ?? null,
    user_id: row.userId,
  };
}

export function serializeBrandSettings(row: BrandSettingsRow) {
  return {
    accent_color: row.accentColor,
    company_name: row.companyName,
    created_at: row.createdAt?.toISOString() ?? null,
    id: row.id,
    logo_url: row.logoUrl,
    updated_at: row.updatedAt?.toISOString() ?? null,
    user_id: row.userId,
    website_url: row.websiteUrl,
  };
}

export function serializeDocumentLink(
  row: DocumentLinkRow,
  extras: {
    document_name?: string | null;
    include_password_hash?: boolean;
    space_name?: string | null;
  } = {},
) {
  return {
    allow_download: row.allowDownload ?? false,
    allowed_domains: row.allowedDomains ?? [],
    allowed_emails: row.allowedEmails ?? [],
    blocked_domains: row.blockedDomains ?? [],
    blocked_emails: row.blockedEmails ?? [],
    created_at: row.createdAt?.toISOString() ?? null,
    document_id: row.documentId,
    document_name: extras.document_name ?? undefined,
    enable_watermark: row.enableWatermark ?? false,
    expires_at: row.expiresAt?.toISOString() ?? null,
    id: row.id,
    is_active: row.isActive ?? true,
    last_visited_at: row.lastVisitedAt?.toISOString() ?? null,
    link_id: row.linkId,
    name: row.name,
    nda_text: row.ndaText,
    password_hash: extras.include_password_hash ? row.passwordHash : undefined,
    require_email: row.requireEmail ?? true,
    require_nda: row.requireNda ?? false,
    require_password: row.requirePassword ?? false,
    space_id: row.spaceId,
    space_name: extras.space_name ?? undefined,
    updated_at: row.updatedAt?.toISOString() ?? null,
    user_id: row.userId,
    visit_count: row.visitCount ?? 0,
    watermark_text: row.watermarkText,
  };
}

export function serializeVisit(row: VisitRow) {
  return {
    browser: row.browser,
    city: row.city,
    completion_rate: row.completionRate ?? 0,
    country: row.country,
    created_at: row.createdAt?.toISOString() ?? null,
    device_type: row.deviceType,
    document_id: row.documentId,
    downloaded: row.downloaded ?? false,
    duration: row.duration ?? 0,
    id: row.id,
    ip_address: row.ipAddress,
    last_activity_at: row.lastActivityAt?.toISOString() ?? null,
    link_id: row.linkId,
    os: row.os,
    page_count_viewed: row.pageCountViewed ?? 0,
    signed_nda: row.signedNda ?? false,
    visitor_email: row.visitorEmail,
    visitor_name: row.visitorName,
  };
}

export function serializeNotification(row: NotificationRow) {
  return {
    created_at: row.createdAt?.toISOString() ?? null,
    id: row.id,
    message: row.message,
    metadata: row.metadata ?? null,
    read: row.read ?? false,
    title: row.title,
    type: row.type,
    user_id: row.userId,
  };
}

export function serializeSignature(row: SignatureRow) {
  return {
    id: row.id,
    link_id: row.linkId,
    nda_text: row.ndaText,
    signed_at: row.signedAt?.toISOString() ?? null,
    signer_email: row.signerEmail,
    signer_ip: row.signerIp,
    signer_name: row.signerName,
    visit_id: row.visitId,
  };
}
