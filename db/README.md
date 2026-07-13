# @reelify/db

Reelify's authoritative data model (plan §8) and versioned migrations, managed
with **Prisma 6** (pinned deliberately; Prisma 7 moved the datasource URL into a
new `prisma.config.ts` + driver-adapter model that is still stabilizing).

- `schema.prisma` — the full model: tenancy/identity, media assets/artifacts,
  jobs + attempts (state machine), transcripts/words, scoring runs/candidates,
  upload sessions, usage events/meters, audit logs, transactional outbox, and an
  idempotency-key store.
- `migrations/` — versioned SQL. The `_init` migration is engine-generated DDL;
  `_active_job_partial_unique_index` adds the partial UNIQUE index that
  guarantees one active job per `(videoAssetId, pipelineVersion)` (Prisma can't
  express partial indexes in-schema).

## Commands

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/reelify?schema=public"

npm run validate        # static schema validation (no DB)
npm run generate        # generate the typed client (no DB)
npm run migrate:deploy  # apply committed migrations (prod/CI)
npm run migrate:status  # show applied vs pending
```

> Use `migrate:deploy` (not `migrate dev`) now that the partial-index migration
> exists, since Prisma does not track that raw-SQL object.

## Verified

- `prisma validate` ✅ · `prisma generate` ✅ · engine-generated DDL includes the
  §8 deterministic uniqueness constraints for transcripts, scoring runs, and clip
  candidates.
- End-to-end apply is exercised against the RDS instance (Terraform `database`
  module) or a local Postgres.
