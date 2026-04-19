DROP TABLE "signatures" CASCADE;--> statement-breakpoint
ALTER TABLE "document_links" DROP COLUMN "require_nda";--> statement-breakpoint
ALTER TABLE "document_links" DROP COLUMN "nda_text";--> statement-breakpoint
ALTER TABLE "visits" DROP COLUMN "signed_nda";