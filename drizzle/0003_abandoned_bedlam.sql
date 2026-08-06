ALTER TABLE "document_chunks" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "ingestion_status" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "chunk_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "embedding_model" text;--> statement-breakpoint
UPDATE "documents" SET "embedding_model" = 'legacy' WHERE "embedding_model" IS NULL;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "embedding_model" SET DEFAULT 'gemini-embedding-001';--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "embedding_model" SET NOT NULL;
