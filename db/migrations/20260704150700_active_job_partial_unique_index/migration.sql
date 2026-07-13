-- Active-job guard (plan §8: processing_jobs "active-job partial unique index").
--
-- Guarantees at most ONE non-terminal (active) processing job per
-- (videoAssetId, pipelineVersion). Prisma cannot express partial indexes in
-- schema.prisma, so this object is managed by raw SQL. Because Prisma does not
-- track it, use `prisma migrate deploy` (not `migrate dev`) once this migration
-- exists, and treat any diff Prisma reports for this index as expected.

CREATE UNIQUE INDEX "processing_jobs_active_unique"
    ON "processing_jobs" ("videoAssetId", "pipelineVersion")
    WHERE "status" NOT IN ('COMPLETED', 'FAILED', 'CANCELLED', 'DELETED');
