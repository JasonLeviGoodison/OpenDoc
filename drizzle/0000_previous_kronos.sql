CREATE TABLE "brand_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"logo_url" text,
	"accent_color" text DEFAULT '#c49a4a',
	"company_name" text,
	"website_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"space_id" uuid,
	"user_id" text NOT NULL,
	"link_id" text NOT NULL,
	"name" text DEFAULT 'Default Link' NOT NULL,
	"is_active" boolean DEFAULT true,
	"require_email" boolean DEFAULT true,
	"require_password" boolean DEFAULT false,
	"password_hash" text,
	"require_nda" boolean DEFAULT false,
	"nda_text" text,
	"allow_download" boolean DEFAULT false,
	"enable_watermark" boolean DEFAULT false,
	"watermark_text" text,
	"expires_at" timestamp with time zone,
	"allowed_emails" text[] DEFAULT '{}',
	"blocked_emails" text[] DEFAULT '{}',
	"allowed_domains" text[] DEFAULT '{}',
	"blocked_domains" text[] DEFAULT '{}',
	"visit_count" integer DEFAULT 0,
	"last_visited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "document_links_link_id_unique" UNIQUE("link_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"original_filename" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" bigint DEFAULT 0 NOT NULL,
	"file_type" text NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"thumbnail_url" text,
	"folder_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"page_number" integer NOT NULL,
	"duration" real DEFAULT 0,
	"entered_at" timestamp with time zone DEFAULT now(),
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"link_id" uuid NOT NULL,
	"signer_email" text NOT NULL,
	"signer_name" text NOT NULL,
	"signer_ip" text,
	"nda_text" text NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "space_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0,
	"folder_name" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo_url" text,
	"banner_url" text,
	"headline" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"company_name" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"document_id" uuid,
	"visitor_email" text,
	"visitor_name" text,
	"ip_address" text,
	"city" text,
	"country" text,
	"device_type" text,
	"browser" text,
	"os" text,
	"duration" real DEFAULT 0,
	"page_count_viewed" integer DEFAULT 0,
	"completion_rate" real DEFAULT 0,
	"downloaded" boolean DEFAULT false,
	"signed_nda" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_activity_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "brand_settings" ADD CONSTRAINT "brand_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_link_id_document_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."document_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_documents" ADD CONSTRAINT "space_documents_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_documents" ADD CONSTRAINT "space_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_link_id_document_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."document_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_settings_user_id_idx" ON "brand_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_links_user_id_idx" ON "document_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_links_link_id_idx" ON "document_links" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "document_links_document_id_idx" ON "document_links" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_folder_id_idx" ON "documents" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "folders_user_id_idx" ON "folders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "page_views_visit_id_idx" ON "page_views" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "page_views_document_id_idx" ON "page_views" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "space_documents_space_id_idx" ON "space_documents" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "spaces_user_id_idx" ON "spaces" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "visits_link_id_idx" ON "visits" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "visits_document_id_idx" ON "visits" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "visits_created_at_idx" ON "visits" USING btree ("created_at");