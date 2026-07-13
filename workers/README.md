# workers/

Queue consumers (ECS Fargate). Each is idempotent and safe against duplicate
messages, crashes, and visibility-timeout expiry (plan §9, §10, §12).

- **ffmpeg/** — one source video per task: claim job, `ffprobe` validate,
  extract audio to bounded ephemeral disk, upload artifact, persist metadata,
  enqueue transcription. Never loads a full 3–5 GB video into RAM.
- **transcription/** — ElevenLabs Scribe v2 integration worker.
- **scoring/** — Gemini clip-scoring integration worker (ports the score >= 65 /
  30–90s / segment-snapping logic from the legacy `lib/gemini.ts`).
- **watchdog/** — (Phase 2) stuck-job watchdog + lease reclaimer + reconciler.

> Status: skeleton. Populated during Phase 1 implementation.
