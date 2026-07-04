# LLM Implementation Prompt — Reelify Backend Media-Processing Revamp (Phases 1–3)

> **How to use this file.** Paste everything below the horizontal rule into a capable autonomous coding agent (with repository, shell, and cloud access) as its task prompt. It is designed to drive the full migration described in [`docs/Project Technical Revamp Plan.md`](./Project%20Technical%20Revamp%20Plan.md), across Phase 1, Phase 2, and Phase 3, using **Terraform** for all infrastructure. The prompt intentionally references the plan by section instead of copying every table, so keep the plan file in the agent's context.

---

## ROLE

You are a **senior backend + platform (DevOps/SRE) engineer** executing a production migration for **Reelify**, a multi-tenant SaaS that turns long-form videos (podcasts, interviews, webinars, calls; typically 3–5 GB, 60–180 min) into short, ready-to-publish clips.

Your job is to move **all FFmpeg work out of the browser** and into an **asynchronous, durable, AWS-backed media-processing pipeline**, and to implement it in three phases exactly as scoped in the plan.

## SOURCE OF TRUTH

- **[`docs/Project Technical Revamp Plan.md`](./Project%20Technical%20Revamp%20Plan.md) is authoritative.** Read it fully before writing any code. Re-read the relevant section before implementing each component.
- If this prompt and the plan ever conflict on **architecture, data model, or scope**, the **plan wins**. This prompt only adds **execution rules, defaults, and acceptance criteria**.
- The core principle you must never violate:
  ```text
  Browser uploads data.
  API records intent and authorization.
  Queues distribute durable work.
  Workers process media asynchronously.
  PostgreSQL records truth.
  Object storage holds large artifacts.
  ```

## STARTING POINT — THE CURRENT SYSTEM YOU ARE REPLACING

The existing app is a Next.js 16 (App Router) + TypeScript + React 18 monolith on Vercel. It does media work the plan explicitly rejects. Do **not** assume it is correct; treat it as legacy to be strangled and cut over.

| Concern | Today (legacy) | Target (this migration) |
| --- | --- | --- |
| FFmpeg | Browser `FFmpeg.wasm`, core loaded from CDN — `lib/hooks/useFFmpeg.ts`, `lib/ffmpegWasm.ts`, `lib/utils/ffmpegUtils.ts` | ECS Fargate FFmpeg workers, one video per task |
| Upload | Server-proxied 1 GB cap, file streamed through Next API — `app/api/upload/route.ts` | Direct browser→S3 multipart upload with short-lived signed URLs |
| Storage | `@vercel/blob` private blobs — `lib/videoStorage.ts` | Private S3 buckets, versioning, lifecycle, SSE-KMS |
| Transcription | ElevenLabs Scribe v2 called inline in an API route with API-key rotation — `app/api/transcribe/route.ts`, `lib/elevenlabs.ts`, `lib/elevenlabs-keys.ts` | `TranscriptionProvider` adapter behind an integration worker |
| Clip scoring | Gemini (`gemini-3-flash-preview`) called inline with hand-rolled JSON repair — `lib/gemini.ts` | `ClipScoringProvider` adapter behind a scoring worker, strict JSON schema |
| Database | Supabase Postgres, simple credit model (`users`, `usage_events`, `demo_requests`, `charge_credits` RPC) — `supabase/schema.sql` | RDS PostgreSQL, full multi-tenant agency/workspace/job/transcript/outbox model |
| Orchestration | None — synchronous request/response | SQS + DLQ + transactional outbox + durable job state machine |
| Progress | In-page state, lost on refresh | Persistent job status via polling (SSE later) |
| Infra | Vercel + Supabase click-ops | **Terraform** for all AWS infra |

Legacy files that embody the old approach (audit and replace/retire as you cut over): `app/api/upload/route.ts`, `app/api/transcribe/route.ts`, `lib/gemini.ts`, `lib/elevenlabs*.ts`, `lib/videoStorage.ts`, `lib/ffmpegWasm.ts`, `lib/hooks/useFFmpeg.ts`, `lib/utils/ffmpegUtils.ts`.

Keep the useful product/UX layer (reel editor, captions, i18n AR/EN, publishing) and the good AI prompt logic in `lib/gemini.ts` (score ≥ 65, duration 30–90 s, segment snapping) — port that logic into the new scoring adapter rather than discarding it.

## TARGET ARCHITECTURE (SUMMARY)

Implement the hybrid architecture from plan §3–§5:

- **Web app**: stays on Vercel; only uploads to S3, creates/reads jobs, and renders persistent progress.
- **Identity**: managed IdP (Cognito/Auth0/Clerk/WorkOS). Reelify still enforces agency/workspace authorization in its own DB.
- **API/control plane**: ECS Fargate service behind API Gateway or ALB. Never runs FFmpeg.
- **Database**: RDS PostgreSQL (Multi-AZ in prod) via RDS Proxy or pooled connections.
- **Object storage**: private S3, multipart uploads, signed URLs, lifecycle rules.
- **Queue**: SQS Standard + DLQ, fed by a **transactional outbox** (never dual-write DB + queue directly).
- **Workers**: ECS Fargate FFmpeg workers (one video per task) + separate lightweight transcription and scoring integration workers.
- **Providers**: ElevenLabs Scribe v2 behind `TranscriptionProvider`; Gemini behind `ClipScoringProvider`.
- **Cross-cutting**: Secrets Manager + KMS, CloudWatch + OpenTelemetry, WAF, immutable per-agency `data_region` (default `"us"`), usage-event ledger.

Match the Mermaid topology and end-to-end flow in plan §4–§5.

## NON-NEGOTIABLE ENGINEERING PRINCIPLES

Apply these to every stage and every PR (plan §7, §8, §10, §11, §12):

1. **DB is the source of truth** for job status; queue messages are derived from the outbox, not from request code.
2. **At-least-once delivery**: every worker is idempotent and safe against duplicate messages, crashes, visibility-timeout expiry, and out-of-order events. Use idempotency key `{job_id}:{stage}:{pipeline_version}:{artifact_checksum}`.
3. **Every write endpoint accepts an `Idempotency-Key`.**
4. **One source video per FFmpeg worker task.** Scale by adding tasks, never by internal concurrency. Never load a full 3–5 GB video into RAM; download to bounded ephemeral disk.
5. **Stages are independently retryable.** A scoring retry must not re-transcribe; a transcription retry must not re-extract audio when a valid audio artifact exists.
6. **Tenant isolation everywhere.** Every tenant-owned row carries `agency_id` (+ `workspace_id` where relevant). Authorization is checked at identity, application, and DB/storage layers. Object keys are tenant-scoped but are **never** used as the authorization check.
7. **Server-side everything sensitive.** S3 bucket/region resolved server-side from `agencies.data_region`, never client input. Signed URLs issued only after RBAC checks. No provider keys or signed URLs in frontend code or logs.
8. **Provider adapters, not scattered calls.** All ElevenLabs/Gemini access goes through the interfaces in plan §10.
9. **Region-aware from day one.** `agencies.data_region` is immutable; default `"us"`; storage routing keyed off it.
10. **Cost attribution from the first job.** Every stage emits a `usage_event` (plan §8 “Cost attribution”).

## TECH, TOOLING & CONVENTIONS (DEFAULTS — STATE ANY DEVIATION)

- **Infrastructure as Code: Terraform is mandatory for 100% of AWS infrastructure.** No console click-ops, no ad-hoc CLI provisioning. If a resource exists, it exists in Terraform. (Full Terraform requirements below.)
- **Language/runtime**: TypeScript on Node.js (LTS) for the API control plane and the transcription/scoring integration workers — this matches the existing repo and team. The FFmpeg worker is a container whose orchestration wrapper is also Node.js/TypeScript, invoking a pinned `ffmpeg`/`ffprobe` binary. *(Default chosen to match the current stack; if you deviate, say why.)*
- **Database access**: a typed query layer / migration tool (e.g. Prisma, Kysely, or `node-pg-migrate`). All schema changes are versioned SQL migrations checked into the repo. Do not mutate schema by hand.
- **Containers**: images built and vulnerability-scanned in CI, pushed to ECR, pinned by digest. FFmpeg worker image: minimal base, pinned `ffmpeg`/`ffprobe`, non-root user, read-only root FS where possible, writable `/work` mount only (plan §9).
- **Config & secrets**: no secrets in the repo or frontend. AWS Secrets Manager + KMS; task roles retrieve at runtime. Provide a documented `.env.example` for local dev only.
- **Testing**: unit tests for adapters, validators, idempotency, and the state machine; integration tests against LocalStack (S3/SQS) and an ephemeral Postgres; a happy-path end-to-end test (upload → extract → transcribe → score → completed).
- **Suggested repository layout** (monorepo; adapt to conventions but keep the separation):
  ```text
  apps/web/                 # existing Next.js app (upload + status UI only for media)
  services/api/             # control-plane API (ECS Fargate)
  services/outbox-dispatcher/ # polls outbox -> SQS
  workers/ffmpeg/           # FFmpeg extraction worker (container)
  workers/transcription/    # ElevenLabs integration worker
  workers/scoring/          # Gemini integration worker
  workers/watchdog/         # (Phase 2) stuck-job watchdog + reconciler
  packages/shared/          # types, provider adapters, db client, idempotency, telemetry
  db/migrations/            # versioned SQL migrations
  infra/terraform/          # all Terraform (see below)
  ```

## TERRAFORM REQUIREMENTS (EXPLICIT — THE USER REQUIRED THIS)

All infrastructure is provisioned with Terraform. Deliver a reviewable, reproducible IaC codebase:

- **Backend/state**: remote state in S3 with DynamoDB state locking (or S3 native locking). No local state committed. State is per-environment.
- **Structure**: reusable **modules** under `infra/terraform/modules/` and thin **environment** roots under `infra/terraform/envs/{dev,staging,prod}/`. Each env is independently `plan`/`apply`-able.
- **Modules to author** (one per bounded component):
  - `network` — VPC, public/private subnets across ≥2 AZs, NAT, VPC endpoints for S3/SQS/Secrets Manager/CloudWatch/ECR.
  - `storage` — private S3 media bucket(s): block public access, versioning, SSE-KMS, lifecycle (multipart abort, audio expiry, tiering), CORS for browser multipart upload.
  - `database` — RDS PostgreSQL (Multi-AZ in prod), RDS Proxy, subnet group, parameter group, automated backups/PITR, encryption.
  - `queue` — SQS work queues + per-class DLQs, redrive policies, visibility timeouts.
  - `compute` — ECS cluster, Fargate task definitions & services for API, outbox dispatcher, and each worker; **service auto-scaling on queue depth + oldest-message-age** (Phase 2+).
  - `registry` — ECR repositories with scan-on-push and lifecycle policies.
  - `iam` — **separate least-privilege task roles** for API, FFmpeg, transcription, and scoring workers (plan §11).
  - `secrets` — Secrets Manager entries + KMS keys (regional keys per data plane).
  - `observability` — CloudWatch log groups, metrics, alarms; OpenTelemetry wiring; dashboards.
  - `edge` — API Gateway/ALB, AWS WAF, rate limiting.
- **Conventions**: consistent resource tagging (`app=reelify`, `env`, `data_region`, `component`, `managed_by=terraform`); pinned provider and module versions; `terraform fmt` + `validate` + `tflint` clean; every module has `variables.tf`, `outputs.tf`, and a short README. Sensitive outputs marked sensitive. `terraform plan` must be clean (no drift) before you claim a phase done.
- **Region awareness**: parameterize region and `data_region`; keep modules composable so a second regional data plane can be added later without rewrites (plan §3 region strategy, §15 evolution thresholds).
- **Phasing**: Terraform grows with the phases — provision only what each phase needs, but design module boundaries so Phase 2/3 additions (autoscaling, watchdog, extra worker pools, cross-region snapshots) slot in without refactoring.

## CROSS-CUTTING DELIVERABLES (BUILD ACROSS ALL PHASES)

- **Data model & migrations** (plan §8): implement the core entities — `agencies` (immutable `data_region`), `users`, `agency_users`, `workspaces`, `workspace_memberships`, `video_assets`, `media_artifacts`, `processing_jobs`, `processing_job_attempts`, `transcripts`, `transcript_words`, `clip_scoring_runs`, `clip_candidates`, `usage_events`, `usage_meters`, `audit_logs`, `outbox_events` — with the specified indexes, statuses, and the deterministic uniqueness constraints that prevent duplicate transcripts/candidates. Provide a migration path from the legacy Supabase credit schema (map existing users/usage into the new model or document a clean-cutover strategy).
- **API & orchestration** (plan §7): implement the endpoint table (upload sessions, parts, complete, create/reuse job, get job, list videos, transcript, clip candidates, cancel, retry, soft-delete). Enforce the job **state machine** and the **transactional-outbox** transaction pattern.
- **Provider adapters** (plan §10): `TranscriptionProvider` (ElevenLabs Scribe v2) and `ClipScoringProvider` (Gemini) with strict JSON-schema output, validation, persisted request/response metadata, and the retry classification table.
- **Security** (plan §11): private buckets, short-lived signed URLs, tenant-scoped keys, three-layer authz, separate task roles, WAF, secrets hygiene, RBAC roles (Agency Owner/Admin/Editor/Client Viewer).
- **Observability** (plan §13): structured logs with the required fields (never log raw transcripts, tokens, or signed URLs), API/queue/worker/provider/business metrics, alerts, and an internal job-operations dashboard.
- **Storage & retention** (plan §14): storage classes, lifecycle policy, soft-delete → hard-delete workflow.

## PHASED EXECUTION — DELIVER IN ORDER

Implement Phase 1 fully and verifiably before Phase 2, and Phase 2 before Phase 3. Do not pull later-phase scope forward except where a module boundary must anticipate it. Respect the **Defer** lists — building deferred items early is a scope violation.

### PHASE 1 — Minimum Viable Backend Processing (plan §18 Phase 1)

**Goal:** a real user can upload a large video directly to S3 and get clip candidates back through a durable async pipeline that survives refreshes — no browser FFmpeg.

**Build:**
- Private S3 bucket in one primary US region; multipart uploads with **server-side** bucket/region routing from `agencies.data_region`.
- `agencies` table with immutable `data_region` (default `"us"` for all launch tenants); `video_assets` and `processing_jobs` tables (plus the minimum related tables needed for the flow).
- Core API endpoints: create upload session, generate signed part URLs, complete upload, create/reuse processing job, get job status (polling).
- One FFmpeg ECS Fargate worker: claim job, `ffprobe` validate, extract audio to bounded disk, upload artifact, persist metadata, enqueue transcription. Use the baseline extraction command and benchmark FLAC vs Opus (plan §9).
- PostgreSQL-backed job status + basic SQS queue.
- ElevenLabs transcription integration + Gemini scoring integration behind the provider adapters (port the existing score ≥ 65 / 30–90 s / segment-snapping logic from `lib/gemini.ts`).
- Persist transcripts, `transcript_words`, and `clip_candidates`.
- Browser **polling** for progress; basic user-visible error messages; manual retry by internal operators.
- Terraform for: network, storage (S3), database (RDS), queue (SQS, DLQ from day one), compute (API + one FFmpeg worker + integration workers), ECR, IAM roles, Secrets Manager/KMS, baseline CloudWatch.

**Explicitly DEFER:** sophisticated fair scheduling; additional regional data planes; API routing by home region; SSE; autoscaling beyond a small worker count; billing automation; full audit-console UI; rendering/export; advanced collaboration.

**Definition of done / acceptance:**
- End-to-end: upload a multi-GB test video → audio extracted on Fargate → transcript persisted → clip candidates persisted → job `COMPLETED`, with zero browser FFmpeg involvement.
- Killing/refreshing the browser mid-job does not affect completion; polling reflects true DB state.
- `terraform plan` is clean; the whole environment is reproducible from IaC.
- Idempotency proven: replaying an SQS message or re-calling `complete` does not create duplicates.

**Validation metrics to instrument (plan §18 Phase 1):** upload completion rate, job completion rate, median & P95 time-to-complete, FFmpeg failure rate, transcription failure rate, cost per completed source hour, clip-candidate acceptance proxy, retry rate.

### PHASE 2 — Production Reliability (plan §18 Phase 2)

**Goal:** the pipeline is trustworthy at paid-customer volume: no silent job loss, self-healing, observable, cost-attributed.

**Build:**
- Transactional **outbox** + dispatcher (if not already the mechanism in Phase 1, harden it here) and **per-class DLQs**.
- **Retry policies by failure class** (plan §10 retry table + §12 classification) with the recommended backoff cadence.
- **Job heartbeat + stuck-job watchdog** that reclaims leases and requeues within budget, escalating to DLQ/manual review.
- **Worker auto-scaling** on queue depth **and** oldest-message-age (plan §15 policy).
- **Tenant concurrency limits** (per-workspace/agency caps from plan §10/§15) and cost ceilings.
- **Usage-event ledger** + **cost dashboard**; per-agency/workspace/video cost attribution.
- Better multipart **resume** UX.
- Structured logs, traces, dashboards, and the full alert set (plan §13).
- **Soft-delete → hard-delete** workflow (plan §14).
- Backup **restore testing**; stronger **RBAC** + **audit logging**.

**Explicitly DEFER:** Kubernetes; cross-region active-active; complex weighted fair scheduler; GPU rendering; enterprise-specific deployments.

**Definition of done / acceptance:**
- Fault-injection proves self-healing: killed workers, duplicated messages, provider 429/5xx, DB deadlocks, and stuck stages all recover without manual intervention or data loss.
- DLQ has clear ownership and a documented drain runbook; alerts fire on the plan §13 triggers.
- Per-agency usage/cost numbers reconcile against real jobs.
- Deletion workflow verifiably removes S3 artifacts and DB records within the documented window.
- Terraform now includes autoscaling, watchdog, alarms, and backup config — `plan` clean, no drift.

**Validation metrics (plan §18 Phase 2):** no silent job loss; DLQ resolution time; queue age under SLA; P95 worker startup time; P95 transcription completion time; per-agency usage accuracy; gross margin by tenant; deletion workflow completion rate.

### PHASE 3 — Scale & Product Expansion (plan §18 Phase 3)

**Goal:** scale economically and expand the product surface without destabilizing the core pipeline.

**Build:**
- **Separate worker pools** for extraction, rendering, captions, and exports (distinct queues + Fargate services + Terraform modules/task defs).
- **Rendered clip artifacts**, **caption generation** (reuse the existing caption renderer where sensible), **review links**, **workspace collaboration**, **client approval workflows**, **brand templates**.
- **Usage-based billing automation** (tie to the Phase 2 ledger; align to the pricing structure in plan §17).
- **Advanced analytics**; **weighted fair scheduling** (`priority = plan_weight + waiting_time_bonus − current_tenant_active_jobs_penalty`); **plan-based priority queues**.
- **Optional archival restore workflow.**
- Evaluate **AWS Batch / EC2-Spot / Kubernetes** only if sustained utilization justifies it (plan §6 “Why not Kubernetes now”, §15 evolution thresholds) — evaluate, don't adopt speculatively.

**Explicitly DEFER:** infra changes not justified by sustained worker utilization; multi-cloud; complex self-hosted AI unless cost or compliance requires it.

**Definition of done / acceptance:**
- Rendering/caption/export run on isolated pools without starving extraction; queue fairness holds under a large-tenant load test.
- Billing automation produces correct invoices/overages from the usage ledger for the plan §17 tiers.
- Any Batch/Spot/K8s decision is backed by measured utilization data, not assumption.

**Validation metrics (plan §18 Phase 3):** export success rate; rendered-minute gross margin; clip review-to-approval conversion; customer retention by plan; storage cost per agency; queue fairness; SLA compliance; operational intervention rate.

## WORKING AGREEMENT (HOW TO EXECUTE)

- **Read the plan section for a component before building it.** Cite the section in your PR description.
- **Strangler migration, not big bang.** Keep the current app working; introduce the new pipeline behind a feature flag; cut over per workspace/agency; retire legacy media code only after the new path is proven.
- **Small, focused, conventional commits and MRs** (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`), one logical component each, with a clear purpose and updated docs.
- **Tests + a clean `terraform plan` are part of "done"** for every phase. Never claim success without running the verification and confirming output.
- **Ask before destructive or irreversible actions** (dropping/migrating production data, deleting buckets, `force` operations, anything touching real customer media). Otherwise choose reasonable defaults and note them.
- **Do not invent vendor prices or quotas.** Where the plan flags unknowns, wire the value as configuration and surface it for validation rather than hardcoding a guess.
- **Report at each milestone:** what was built, which plan section it satisfies, how you verified it (commands + output), the Terraform resources added, deferred items, and open risks.

## GUARDRAILS & THINGS TO CONFIRM (plan §19)

Surface these explicitly; do not silently assume:
1. ElevenLabs & Gemini real pricing, throughput, payload limits, idempotency, and retry behavior (drives included-minute allowances).
2. Real-world media variability (VFR, unsupported codecs, corrupt files, 4K, multi-track audio, unusual containers) — validate `ffprobe` guardrails against a benchmark corpus.
3. Retention economics for persistent 3–5 GB sources.
4. Graceful degradation on third-party outages (preserve completed stages, pause, communicate, retry).
5. Tenant fairness (per-agency limits before large agencies degrade others).
6. Data privacy / regional commitments — confirm ElevenLabs & Gemini processing locations before any residency claim; keep `data_region` immutable; publish a subprocessor/data-transfer policy.
7. Upload performance outside the launch region (benchmark AU/UK before promising parity).
8. Future render workload cost may exceed extraction+scoring — design Phase 3 pools with that in mind.

## FINAL DELIVERABLE CHECKLIST

- [ ] Phase 1, 2, 3 delivered in order, each meeting its definition of done and instrumented with its validation metrics.
- [ ] All AWS infrastructure in Terraform (modules + per-env roots, remote state, clean `plan`, least-privilege IAM, region-aware).
- [ ] New async pipeline: S3 multipart upload → SQS/outbox → Fargate FFmpeg worker → transcription worker → scoring worker → RDS job state → clip candidates.
- [ ] Provider adapters for ElevenLabs and Gemini with strict validation and retry classes.
- [ ] Full data model with tenant isolation, idempotency, and cost attribution.
- [ ] Observability (logs/metrics/traces/alerts/dashboard) and security (RBAC, private storage, secrets, WAF).
- [ ] Legacy browser-FFmpeg / Vercel-Blob / synchronous paths retired after cutover.
- [ ] Migration notes, runbooks (DLQ drain, provider outage, DB failover, accidental deletion), and updated README/`.env.example`.
