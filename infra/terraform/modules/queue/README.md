# Module: queue

SQS work queues with per-class dead-letter queues (plan §12). Phase 1 creates
three classes — `extraction`, `transcription`, `scoring` — each with:

- a work queue (managed SSE, long polling, class-appropriate visibility timeout),
- a matching DLQ (14-day retention),
- a redrive policy (`maxReceiveCount`, default 5) and a redrive-allow policy so
  only the paired work queue can feed the DLQ.

Messages are produced only by the outbox dispatcher and consumed by the workers.
Visibility timeouts are sized per class (extraction is the longest because
FFmpeg work runs longest).

## Outputs

`queue_urls`, `queue_arns`, `dlq_urls`, `dlq_arns` — all maps keyed by class,
consumed by the `iam` and `compute` modules.
