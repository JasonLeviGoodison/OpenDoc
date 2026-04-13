ALTER TABLE "documents" ADD COLUMN "preview_file_url" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "preview_file_type" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "preview_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "preview_error" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "preview_page_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "preview_updated_at" timestamp with time zone;