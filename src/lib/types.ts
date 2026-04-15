export interface Document {
  id: string;
  user_id: string;
  name: string;
  original_filename: string;
  file_url: string;
  file_size: number;
  file_type: string;
  page_count: number;
  preview_error: string | null;
  preview_file_type: string | null;
  preview_file_url: string | null;
  preview_page_count: number;
  preview_status: string;
  preview_updated_at: string | null;
  thumbnail_url: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentLink {
  id: string;
  document_id: string;
  space_id: string | null;
  user_id: string;
  link_id: string;
  name: string;
  is_active: boolean;
  require_email: boolean;
  require_password: boolean;
  password_hash: string | null;
  require_nda: boolean;
  nda_text: string | null;
  allow_download: boolean;
  enable_watermark: boolean;
  watermark_text: string | null;
  expires_at: string | null;
  allowed_emails: string[];
  blocked_emails: string[];
  allowed_domains: string[];
  blocked_domains: string[];
  visit_count: number;
  last_visited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  link_id: string;
  document_id: string;
  visitor_email: string | null;
  visitor_name: string | null;
  ip_address: string | null;
  city: string | null;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  duration: number;
  page_count_viewed: number;
  completion_rate: number;
  downloaded: boolean;
  signed_nda: boolean;
  created_at: string;
  last_activity_at: string;
}

export interface Notification {
  created_at: string | null;
  id: string;
  message: string;
  metadata: Record<string, string | number | boolean | null> | null;
  read: boolean;
  title: string;
  type: string;
  user_id: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

export interface PageView {
  id: string;
  visit_id: string;
  document_id: string;
  page_number: number;
  duration: number;
  entered_at: string;
  left_at: string | null;
}

export interface DocumentPageAnalyticsEntry {
  last_viewed_at: string | null;
  page_number: number;
  total_duration: number;
  total_views: number;
  unique_visits: number;
}

export interface DocumentPageSessionEntry {
  last_viewed_at: string | null;
  page_number: number;
  total_duration: number;
  total_views: number;
}

export interface DocumentPageSessionAnalytics {
  completion_rate: number;
  created_at: string | null;
  last_activity_at: string | null;
  page_analytics: DocumentPageSessionEntry[];
  page_count_viewed: number;
  tracked_duration: number;
  visit_duration: number;
  visit_id: string;
  visitor_email: string | null;
  visitor_name: string | null;
}

export interface DocumentPageAnalytics {
  file_type: string;
  page_analytics: DocumentPageAnalyticsEntry[];
  page_count: number;
  preview_status?: string;
  session_analytics: DocumentPageSessionAnalytics[];
}

export interface Space {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  headline: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpaceDocument {
  id: string;
  space_id: string;
  document_id: string;
  order_index: number;
  folder_name: string | null;
  created_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Signature {
  id: string;
  visit_id: string;
  link_id: string;
  signer_email: string;
  signer_name: string;
  signer_ip: string | null;
  nda_text: string;
  signed_at: string;
}

export interface BrandSettings {
  id: string;
  user_id: string;
  logo_url: string | null;
  accent_color: string;
  company_name: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsOverview {
  totalViews: number;
  uniqueVisitors: number;
  avgTimeSpent: number;
  completionRate: number;
  viewsOverTime: { date: string; views: number }[];
  topDocuments: { id: string; name: string; views: number }[];
  recentVisitors: Visit[];
}
