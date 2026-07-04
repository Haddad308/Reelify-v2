# services/

Long-running control-plane services (ECS Fargate). None run FFmpeg.

- **api/** — control-plane API: upload sessions/parts/complete, create/reuse
  job, get job, list videos, transcript, clip candidates, cancel, retry,
  soft-delete. Enforces the job state machine and the transactional-outbox
  transaction pattern (plan §7).
- **outbox-dispatcher/** — polls `outbox_events` and publishes to SQS. The queue
  is fed from the outbox, never dual-written from request code (plan §7, §12).

> Status: skeleton. Populated during Phase 1 implementation.
