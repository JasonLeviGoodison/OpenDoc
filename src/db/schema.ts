import {
  type AnyPgColumn,
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  bigint,
  real,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Users (synced from Clerk) ──────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  companyName: text('company_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  documents: many(documents),
  documentLinks: many(documentLinks),
  spaces: many(spaces),
  folders: many(folders),
  brandSettings: one(brandSettings),
}));

// ─── Brand Settings ─────────────────────────────────────────────────────────

export const brandSettings = pgTable('brand_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  logoUrl: text('logo_url'),
  accentColor: text('accent_color').default('#c49a4a'),
  companyName: text('company_name'),
  websiteUrl: text('website_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex('brand_settings_user_id_idx').on(t.userId),
]);

export const brandSettingsRelations = relations(brandSettings, ({ one }) => ({
  user: one(users, { fields: [brandSettings.userId], references: [users.id] }),
}));

// ─── Folders ────────────────────────────────────────────────────────────────

export const folders = pgTable('folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => folders.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('folders_user_id_idx').on(t.userId),
]);

export const foldersRelations = relations(folders, ({ one, many }) => ({
  user: one(users, { fields: [folders.userId], references: [users.id] }),
  parent: one(folders, { fields: [folders.parentId], references: [folders.id], relationName: 'parentChild' }),
  children: many(folders, { relationName: 'parentChild' }),
  documents: many(documents),
}));

// ─── Documents ──────────────────────────────────────────────────────────────

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  originalFilename: text('original_filename').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull().default(0),
  fileType: text('file_type').notNull(),
  pageCount: integer('page_count').notNull().default(0),
  thumbnailUrl: text('thumbnail_url'),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('documents_user_id_idx').on(t.userId),
  index('documents_folder_id_idx').on(t.folderId),
]);

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  folder: one(folders, { fields: [documents.folderId], references: [folders.id] }),
  links: many(documentLinks),
  visits: many(visits),
  pageViews: many(pageViews),
  spaceDocuments: many(spaceDocuments),
}));

// ─── Spaces / Data Rooms ────────────────────────────────────────────────────

export const spaces = pgTable('spaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  headline: text('headline'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('spaces_user_id_idx').on(t.userId),
]);

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  user: one(users, { fields: [spaces.userId], references: [users.id] }),
  spaceDocuments: many(spaceDocuments),
  links: many(documentLinks),
}));

// ─── Space Documents (junction) ─────────────────────────────────────────────

export const spaceDocuments = pgTable('space_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  spaceId: uuid('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').default(0),
  folderName: text('folder_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('space_documents_space_id_idx').on(t.spaceId),
]);

export const spaceDocumentsRelations = relations(spaceDocuments, ({ one }) => ({
  space: one(spaces, { fields: [spaceDocuments.spaceId], references: [spaces.id] }),
  document: one(documents, { fields: [spaceDocuments.documentId], references: [documents.id] }),
}));

// ─── Shareable Links ────────────────────────────────────────────────────────

export const documentLinks = pgTable('document_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  spaceId: uuid('space_id').references(() => spaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkId: text('link_id').unique().notNull(),
  name: text('name').notNull().default('Default Link'),
  isActive: boolean('is_active').default(true),
  requireEmail: boolean('require_email').default(true),
  requirePassword: boolean('require_password').default(false),
  passwordHash: text('password_hash'),
  requireNda: boolean('require_nda').default(false),
  ndaText: text('nda_text'),
  allowDownload: boolean('allow_download').default(false),
  enableWatermark: boolean('enable_watermark').default(false),
  watermarkText: text('watermark_text'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  allowedEmails: text('allowed_emails').array().default([]),
  blockedEmails: text('blocked_emails').array().default([]),
  allowedDomains: text('allowed_domains').array().default([]),
  blockedDomains: text('blocked_domains').array().default([]),
  visitCount: integer('visit_count').default(0),
  lastVisitedAt: timestamp('last_visited_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('document_links_user_id_idx').on(t.userId),
  index('document_links_link_id_idx').on(t.linkId),
  index('document_links_document_id_idx').on(t.documentId),
]);

export const documentLinksRelations = relations(documentLinks, ({ one, many }) => ({
  document: one(documents, { fields: [documentLinks.documentId], references: [documents.id] }),
  space: one(spaces, { fields: [documentLinks.spaceId], references: [spaces.id] }),
  user: one(users, { fields: [documentLinks.userId], references: [users.id] }),
  visits: many(visits),
  signatures: many(signatures),
}));

// ─── Visits / Analytics ─────────────────────────────────────────────────────

export const visits = pgTable('visits', {
  id: uuid('id').primaryKey().defaultRandom(),
  linkId: uuid('link_id').notNull().references(() => documentLinks.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
  visitorEmail: text('visitor_email'),
  visitorName: text('visitor_name'),
  ipAddress: text('ip_address'),
  city: text('city'),
  country: text('country'),
  deviceType: text('device_type'),
  browser: text('browser'),
  os: text('os'),
  duration: real('duration').default(0),
  pageCountViewed: integer('page_count_viewed').default(0),
  completionRate: real('completion_rate').default(0),
  downloaded: boolean('downloaded').default(false),
  signedNda: boolean('signed_nda').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('visits_link_id_idx').on(t.linkId),
  index('visits_document_id_idx').on(t.documentId),
  index('visits_created_at_idx').on(t.createdAt),
]);

export const visitsRelations = relations(visits, ({ one, many }) => ({
  link: one(documentLinks, { fields: [visits.linkId], references: [documentLinks.id] }),
  document: one(documents, { fields: [visits.documentId], references: [documents.id] }),
  pageViews: many(pageViews),
  signatures: many(signatures),
}));

// ─── Page Views ─────────────────────────────────────────────────────────────

export const pageViews = pgTable('page_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitId: uuid('visit_id').notNull().references(() => visits.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  pageNumber: integer('page_number').notNull(),
  duration: real('duration').default(0),
  enteredAt: timestamp('entered_at', { withTimezone: true }).defaultNow(),
  leftAt: timestamp('left_at', { withTimezone: true }),
}, (t) => [
  index('page_views_visit_id_idx').on(t.visitId),
  index('page_views_document_id_idx').on(t.documentId),
]);

export const pageViewsRelations = relations(pageViews, ({ one }) => ({
  visit: one(visits, { fields: [pageViews.visitId], references: [visits.id] }),
  document: one(documents, { fields: [pageViews.documentId], references: [documents.id] }),
}));

// ─── NDA Signatures ─────────────────────────────────────────────────────────

export const signatures = pgTable('signatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitId: uuid('visit_id').notNull().references(() => visits.id, { onDelete: 'cascade' }),
  linkId: uuid('link_id').notNull().references(() => documentLinks.id, { onDelete: 'cascade' }),
  signerEmail: text('signer_email').notNull(),
  signerName: text('signer_name').notNull(),
  signerIp: text('signer_ip'),
  ndaText: text('nda_text').notNull(),
  signedAt: timestamp('signed_at', { withTimezone: true }).defaultNow(),
});

export const signaturesRelations = relations(signatures, ({ one }) => ({
  visit: one(visits, { fields: [signatures.visitId], references: [visits.id] }),
  link: one(documentLinks, { fields: [signatures.linkId], references: [documentLinks.id] }),
}));
