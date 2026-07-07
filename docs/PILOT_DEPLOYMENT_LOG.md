# Reelify Phase 1 Pilot — Deployment Log (A → Z)

This document records **everything** done to move Reelify off the browser‑FFmpeg /
Vercel / Supabase stack onto an AWS async media pipeline, and to take
`reelify.cc` live for a **single‑agency pilot**.

- **AWS account:** `666730152143`
- **Region:** `us-east-1`
- **Branch:** `feat/phase1-aws-foundation`
- **Domain:** `reelify.cc` (registrar: Dynadot; DNS delegated to Route53)
- **Posture:** deliberately *lean* — one production environment, no scale
  features (see [Deferred](#deferred-until-scale)).

---

## 1. Final live state

| Thing | Value |
| --- | --- |
| Web app | `https://reelify.cc` (+ `www.`) |
| API | `https://api.reelify.cc/v1/*` → `/v1/healthz` returns `{"status":"ok"}` |
| Auth | Amazon Cognito (`AUTH_MODE=cognito`) |
| ECS cluster | `reelify` — services `reelify-api`, `reelify-ffmpeg`, `reelify-light`, `reelify-web` (all 1/1) |
| Load balancer | `reelify-alb` (public ALB; `/v1/*` → API, else → web) |
| Database | RDS Postgres `reelify-pg` (private) |
| Media bucket | `reelify-media-us` (SSE‑KMS, versioned, CORS exposes `ETag`) |
| Queues | `reelify-extraction`, `-transcription`, `-scoring` (+ DLQs) |
| Logs | CloudWatch `/ecs/reelify` (14‑day retention) |
| Budget | `reelify-monthly` ($60) |
| Container registry | ECR `reelify/backend`, `reelify/web` |

**Pilot tenant seeded:** agency `ag_e2e`, workspace `ws_e2e`, dev user
`e2e-user` (now rejected — cognito mode), and Cognito owner `owner@reelify.cc`.

---

## 2. Architecture as built

```
                    Dynadot (registrar)
                          │  NS delegation
                          ▼
                    Route53 zone reelify.cc ──── ACM cert (*.reelify.cc, DNS-validated)
                          │
      reelify.cc / www ───┤                api.reelify.cc
                          ▼                      │
                 ┌──────────────── Public ALB (:80→:443) ───────────────┐
                 │  default → web TG            /v1/* → api TG           │
                 └───────────┬───────────────────────────┬──────────────┘
                             ▼                            ▼
                    ECS Fargate (public subnets, no NAT — cost lean)
   ┌───────────────┬───────────────┬────────────────────────┬─────────────┐
   │ reelify-web   │ reelify-api   │ reelify-ffmpeg         │ reelify-light│
   │ (Next.js)     │ (Fastify)     │ (extract audio)        │ dispatcher + │
   │               │               │                        │ transcription│
   │               │               │                        │ + scoring    │
   └───────────────┴──────┬────────┴───────────┬────────────┴──────┬──────┘
                          │                     │                   │
                    RDS Postgres          S3 reelify-media-us   SQS queues
                    (private)             (KMS, versioned)      (+ DLQs)
                          ▲                                         ▲
                    Secrets Manager (DATABASE_URL, provider keys)   │
                    Cognito user pool ── access-token verification ─┘
```

**Async pipeline (transactional outbox → SQS → workers):**

```
upload complete ─▶ ProcessingJob (QUEUED) + OutboxEvent  [one DB tx]
   │
   ├─ outbox-dispatcher ─▶ SQS extraction
   ├─ ffmpeg worker      ─▶ pull source from S3, extract audio to S3, enqueue transcription
   ├─ transcription      ─▶ ElevenLabs STT, persist Transcript(+words), enqueue scoring
   └─ scoring            ─▶ Gemini clip scoring, persist ClipCandidate rows ─▶ job COMPLETED
```

One **single backend image** (`Dockerfile.backend`) runs all three backend
roles; the ECS task definition overrides the container command per service. The
"light" worker co‑locates dispatcher + transcription + scoring in one task to
keep the pilot to ~3 backend tasks. FFmpeg is isolated (larger CPU/ephemeral
disk).

---

## 3. Terraform layout

```
infra/terraform/
  bootstrap/                 # remote state (S3 reelify-tfstate-666730152143 + DynamoDB lock)
  modules/
    network/                 # VPC, public/private subnets; create_nat_gateway + endpoints toggles
    storage/                 # S3 media bucket (SSE-KMS, versioning, CORS exposes ETag)
    secrets/                 # KMS key + Secrets Manager containers (values set out-of-band)
    queue/                   # SQS work queues + DLQs
    iam/                     # execution role + per-service task roles (least privilege)
    database/                # RDS Postgres (managed master password)
    registry/                # ECR repos (backend, web)
    dns/                     # Route53 zone + (gated) ACM cert + validation
    edge/                    # public ALB, target groups, listeners, alias records
    compute/                 # ECS cluster + api/ffmpeg/light/web task defs + services
    cognito/                 # user pool + public app client + hosted-UI domain
  envs/
    prod/                    # THE single live stack (was: dev, now destroyed)
```

The **prod stack is phased** via variables so a deploy can proceed around the
Dynadot DNS gate:

| Variable | Purpose |
| --- | --- |
| `backend_image` | empty → skip ECS; set → create backend services |
| `web_image` | empty → skip web service; set → create web service |
| `create_certificate` | false → HTTP only; true → ACM cert + HTTPS listener |
| `enable_dns_records` | false → no Route53 aliases; true → apex/www/api → ALB |
| `enable_cognito` | create the Cognito pool/client/domain |
| `auth_mode` | `dev` (X‑Reelify‑User header) or `cognito` (Bearer JWT) |

---

## 4. Chronological log (what actually happened)

### Stage 0 — starting point (prior sessions)
- Monorepo skeleton (`packages/shared`, `services/`, `workers/`, `db/`) with a
  proven local end‑to‑end run (`sharks.mp4` → transcript + Gemini clip
  candidate).
- `bootstrap` state backend applied; a `dev` env stack live (VPC + NAT + 6
  interface endpoints + S3 + SQS + secrets + IAM + RDS).
- `prod` env + `compute`/`edge`/`dns` modules authored but **not applied**.

### Stage 1 — Phase 1 prod apply (core infra)
1. Exported temporary `aws login` creds into the shell (the S3 backend can't
   read the `login` credential source directly):
   ```bash
   unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
   eval "$(aws configure export-credentials --format env)"; export AWS_REGION=us-east-1
   ```
2. `terraform init` + `apply` in `envs/prod` → **68 resources**: lean VPC (no
   NAT, no interface endpoints), S3, SQS, secrets, IAM (6 task roles), RDS
   (`db.t4g.micro`, single‑AZ, 1‑day backups per Free plan), ECR, Route53 zone,
   public ALB (HTTP only at this point).
3. Populated prod secrets **out‑of‑band** (never in TF state):
   - copied `provider/elevenlabs` + `provider/gemini` from the dev secrets;
   - built `reelify/database/url` from the RDS‑managed master secret + endpoint.

### Stage 2 — backend image + ECS
4. Built `Dockerfile.backend` and pushed to ECR. **Fixes required:**
   - `npm ci` failed (`@swc/helpers` lockfile drift) — the node image ships
     npm 10 but the lockfile was written by npm 11 → added
     `npm install -g npm@11 && npm ci`.
   - First image built on Apple Silicon → tasks crashed with
     `exec format error` (Fargate is x86_64) → rebuilt with
     `--platform linux/amd64`.
5. `terraform apply -var backend_image=…` created the ECS cluster + `api`,
   `ffmpeg`, `light` services.
6. **DB migration** run as a one‑off ECS task (RDS is private) on the API task
   definition: `npx prisma migrate deploy` → 2 migrations applied.
7. **Light worker fix:** the co‑located command used `wait -n`, which the
   image's `sh` (dash) rejected (`Illegal option -n`) → changed to `wait`.

### Stage 3 — verify pipeline on the ALB
8. Seeded the pilot tenant (`ag_e2e` / `ws_e2e` / `e2e-user`) via a one‑off
   ECS task running `prisma db execute`.
9. Ran the real end‑to‑end smoke test against the ALB with `sharks.mp4`:
   `QUEUED → PROCESSING_AUDIO → TRANSCRIBING → SCORING_CLIPS → COMPLETED`.

### Stage 4 — HTTPS + DNS (Phase 4)
10. User set the 4 Route53 nameservers at Dynadot. Verified delegation is live
    (`dig NS reelify.cc @8.8.8.8` → the awsdns hosts).
11. First Phase‑4 apply **failed**: the `edge` module derived
    `https_enabled = certificate_arn != ""`, but that ARN is *known‑only‑after‑apply*
    when the ACM cert is created in the same run → `count`/`for_each` cannot
    depend on it. **Fix:** added a static `enable_https` bool to the edge module
    (wired to `create_certificate`) and split the HTTP listener into two
    mutually‑exclusive `default_action` blocks (so the redirect variant never
    sets `target_group_arn`, which the provider rejects).
12. `terraform apply -var create_certificate=true -var enable_dns_records=true`
    → ACM cert DNS‑validated, HTTPS listener up, apex/www/api alias records
    created. Verified `https://api.reelify.cc/v1/healthz` and the HTTP→HTTPS 301.

### Stage 5 — Cognito
13. Authored the `cognito` module: user pool (admin‑create only, email
    username), **public** app client (no secret) with `USER_PASSWORD_AUTH` +
    hosted‑UI OAuth code flow, and a hosted‑UI domain (`reelify-auth`).
14. `terraform apply -var enable_cognito=true` created the pool/client/domain.
15. Provisioned the owner: `admin-create-user` + `admin-set-user-password`
    (permanent) → captured the Cognito `sub`; inserted a matching `users` row
    (`authSubject = sub`) + `agency_users` OWNER membership via a one‑off ECS
    task.
16. `terraform apply -var auth_mode=cognito` injected `COGNITO_USER_POOL_ID` +
    `COGNITO_CLIENT_ID` and flipped the API. **Verified end‑to‑end:** dev header
    → **401**; owner Bearer access token → **200** (returned the pilot video).

### Stage 6 — web on ECS
17. `next.config.mjs`: added `output: "standalone"`.
18. `Dockerfile.web`: multi‑stage standalone build; `NEXT_PUBLIC_*` baked in as
    build args (`NEXT_PUBLIC_API_BASE=https://api.reelify.cc`,
    `NEXT_PUBLIC_AUTH_MODE=cognito`, `NEXT_PUBLIC_PILOT_WORKSPACE_ID=ws_e2e`).
    **Fix:** `next build` type‑checks project `.ts` files, which reaches
    `@reelify/db`'s re‑export of the generated Prisma client (absent in Docker)
    → added `npx prisma generate` to the web builder stage.
19. **Gotcha:** in **zsh**, `"$ECR:latest"` triggers the `:l` (lowercase)
    parameter modifier → tag became `…/reelify/webatest`. Fixed by using
    `"${ECR}:latest"` (braces) / re‑tagging before push.
20. `terraform apply -var web_image=…` created the `reelify-web` service. Web
    target healthy; `https://reelify.cc/en/studio` → 200.

### Stage 7 — teardown + ops
21. **Destroyed the old `dev` stack** (`terraform destroy` in `envs/dev`) — 64
    resources removed (NAT, 6 interface endpoints, RDS, VPC) → ends ~$50–80/mo.
22. **Ops:** AWS Budgets `reelify-monthly` ($60, optional email alerts),
    CloudWatch log retention 14 days, and `docs/RUNBOOK.md`.

### Stage 8 — pilot UI removed
23. Removed the temporary pilot **Studio UI** (`app/[locale]/studio/page.tsx`,
    `components/studio/*`) and reverted the `/studio` middleware allowlist. The
    typed API client `lib/reelifyApi.ts` was **kept** as the foundation for the
    real frontend (see `docs/FRONTEND_INTEGRATION_GUIDE.md`).

> **Note:** removing the Studio page from source does **not** change the live
> site until the web image is rebuilt + redeployed. The currently‑deployed
> `reelify-web` image still serves `/studio` until then.

---

## 5. Credentials & secrets

- **AWS:** temporary `aws login` session (expires). Re‑auth with `aws login`
  before Terraform/ECR/ECS work; re‑export creds into the shell as in Stage 1.
- **Cognito owner (pilot):** `owner@reelify.cc` — password was generated and
  shared out‑of‑band in chat. Mint an access token with `USER_PASSWORD_AUTH`
  (see RUNBOOK) and paste it into the app.
- **Provider keys** live only in Secrets Manager (`reelify/provider/*`) and are
  injected into containers at launch. **The previously git‑committed keys must
  be rotated** (they exist in git history) — see Remaining steps.
- **DB:** app `DATABASE_URL` in `reelify/database/url`; RDS master password in
  an RDS‑managed secret (never in TF state).

---

## 6. Costs (rough, pilot)

Fargate (~3–4 small tasks) + ALB + RDS `db.t4g.micro` + S3/SQS/KMS ≈ **$25–45/mo**.
The destroyed `dev` stack was the expensive part (NAT ~$32 + 6 interface
endpoints ~$43). Budget alarm set at $60.

---

## 7. Deferred until scale

Not built for the 1‑agency pilot (add around ~10 agencies): autoscaling, a
queue‑depth watchdog, multi‑AZ RDS, RDS Proxy, NAT + interface endpoints,
CloudFront, AWS WAF, multi‑region data residency enforcement, clip rendering /
export pipeline, billing/usage metering surfaces.

---

## 8. Remaining manual steps (owner)

1. **Rotate** the previously‑committed ElevenLabs / Gemini / Google / Facebook
   keys; update Secrets Manager (`reelify/provider/*`) and force a
   `reelify-light` redeploy.
2. **Retire the Vercel deployment** once satisfied `reelify.cc` serves from AWS.
3. **Budget email:** re‑apply with `-var budget_alert_email=you@example.com`.
4. Optionally **redeploy web** after the Studio removal / when the new frontend
   is ready.
```
