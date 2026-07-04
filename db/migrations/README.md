# db/migrations

Versioned SQL migrations (managed via Prisma Migrate). Schema is never mutated
by hand. Implements the plan §8 data model:

`agencies` (immutable `data_region`), `users`, `agency_users`, `workspaces`,
`workspace_memberships`, `video_assets`, `media_artifacts`, `processing_jobs`,
`processing_job_attempts`, `transcripts`, `transcript_words`,
`clip_scoring_runs`, `clip_candidates`, `usage_events`, `usage_meters`,
`audit_logs`, `outbox_events` — with the indexes, statuses, and deterministic
uniqueness constraints that prevent duplicate transcripts/candidates.

> Status: skeleton. Populated during Phase 1 implementation.
