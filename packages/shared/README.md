# @reelify/shared

Shared TypeScript library used by the API and all workers (plan §7, §10, §12).

Will contain:

- **types** — job/stage/status enums, DB row types, queue message contracts.
- **provider adapters** — `TranscriptionProvider` (ElevenLabs Scribe v2) and
  `ClipScoringProvider` (Gemini) with strict JSON-schema validation and the
  retry-classification table.
- **idempotency** — helpers around the key `{job_id}:{stage}:{pipeline_version}:{artifact_checksum}`.
- **db client** — typed Prisma client wrapper + transactional-outbox helpers.
- **telemetry** — structured logging + OpenTelemetry wiring (never logs raw
  transcripts, tokens, or signed URLs).

> Status: skeleton. Populated during Phase 1 implementation.
