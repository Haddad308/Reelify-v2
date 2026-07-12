# Frontend integration guide — legacy app → AWS backend

This guide is for the **frontend engineer** converting the existing Reelify
Next.js UX (`app/[locale]/app/page.tsx` and related flows) from the **legacy
browser pipeline** to the **new AWS control-plane API** at `https://api.reelify.cc`.

Use this document + `lib/reelifyApi.ts`
as the contract reference while rebuilding the product UI on top of the deployed
stack.

---

## 1. What changed (mental model)

| Before (legacy) | After (AWS pilot) |
| --- | --- |
| Video processing in **browser** via `@ffmpeg/ffmpeg` (WASM) | Upload **source video** to S3; processing runs **server-side** |
| `POST /api/upload` → Vercel Blob | `POST /v1/workspaces/{id}/upload-sessions` → presigned **multipart** PUTs to S3 |
| Client extracts WAV with FFmpeg.wasm | FFmpeg worker extracts audio in ECS |
| `POST /api/process` (FormData + audio blob URL) | Automatic job enqueue on upload **complete**; poll job status |
| Transcript + clips returned in one HTTP response | Poll job → fetch **transcript** + **clip candidates** when `COMPLETED` |
| Auth: Supabase + `reelify_user_id` cookie | Auth: **Amazon Cognito** access token (`Authorization: Bearer …`) |
| User/credits in Supabase | Tenancy in Postgres (`agency` → `workspace` → `video`); credits TBD |

**Keep the existing UI/UX patterns** (upload card, progress, results grid,
locale, PostHog, etc.) but **replace the data layer** — do not port FFmpeg.wasm
or the `/api/process` route for the new path.

---

## 2. Live endpoints & env vars

Production (baked into the web Docker image at build time):

| Variable | Production value | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | `https://api.reelify.cc` | Control-plane API base (no trailing slash) |
| `NEXT_PUBLIC_AUTH_MODE` | `cognito` | Must match API `AUTH_MODE` |
| `NEXT_PUBLIC_SITE_URL` | `https://reelify.cc` | Metadata, OAuth redirects |

Local dev against the API (run `@reelify/api` on `:8090` or tunnel to prod):

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8090
NEXT_PUBLIC_AUTH_MODE=dev          # only when API runs with AUTH_MODE=dev
```

**Cognito (production):**

| Output | Value (pilot) |
| --- | --- |
| User pool ID | `us-east-1_8EcTmjQmQ` |
| App client ID | `2kq0sp03kcp58tphi7e64iqf0t` |
| Hosted UI domain | `reelify-auth.auth.us-east-1.amazoncognito.com` |

Pilot workspace: `ws_e2e` (seeded). Every API call is scoped to a **workspace**
the user belongs to.

---

## 3. Authentication

### Production: Cognito access tokens

The API verifies **access tokens** (not ID tokens). Every request needs:

```http
Authorization: Bearer <access_token>
```

**Recommended integration:**

1. Add Cognito Hosted UI or Amplify Auth for sign-in.
2. Store the **access token** (memory + secure refresh strategy; avoid
   localStorage for high-security deployments).
3. Attach the token on every API call (see `lib/reelifyApi.ts` → `authHeaders`).

**Manual token (debugging only):**

```bash
aws cognito-idp initiate-auth --region us-east-1 \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id 2kq0sp03kcp58tphi7e64iqf0t \
  --auth-parameters USERNAME=owner@reelify.cc,PASSWORD='…' \
  --query 'AuthenticationResult.AccessToken' --output text
```

**OAuth callback URLs** must be registered on the Cognito app client (Terraform
var `cognito_callback_urls`). After Studio removal, use real app routes, e.g.
`https://reelify.cc/en/app` or a dedicated `/auth/callback` handler.

### Legacy middleware vs new auth

`middleware.ts` still gates most locale routes behind the **`reelify_user_id`
cookie** (Supabase-era login). You must **replace this** with Cognito session
checks (or a short-lived session cookie set after Cognito login). Until then,
users hit `/login` before reaching `/en/app`.

**Do not** rely on `x-reelify-user` in production — the API rejects it when
`AUTH_MODE=cognito`.

### User provisioning (important)

Cognito proves **identity** (`sub`). The API proves **tenancy** (user row +
agency/workspace membership in Postgres). A Cognito user with no DB row gets
**403 user is not provisioned** until provisioned.

**Self sign-up is enabled** on the Cognito user pool (Hosted UI + SignUp API).
After the user confirms their email and obtains tokens, call:

```http
POST /v1/auth/provision
Authorization: Bearer <access_token>
Content-Type: application/json

{ "email": "user@example.com" }
```

`email` in the body is optional when the access token already carries it
(Cognito `username` when email is the username attribute). Response:

```json
{ "userId": "usr_…", "workspaceId": "ws_e2e", "created": true }
```

The call is **idempotent** — safe to run after every login. New users are added
to the pilot workspace (`ws_e2e`) with `EDITOR` membership.

Admin-created users (legacy) still work: create via `admin-create-user`, then
insert `users.authSubject` + membership rows manually if not using provision.

---

## 4. API reference (v1)

Base URL: `{NEXT_PUBLIC_API_BASE}`  
Errors: `{ "error": "<code>", "message": "<human text>" }`  
Status codes: `400 bad_request`, `401 unauthorized`, `403 forbidden`,
`404 not_found`, `409 conflict`, `500 internal`.

### Health

```http
GET /v1/healthz
→ 200 { "status": "ok" }
```

No auth.

---

### Upload flow (replaces `/api/upload` + browser FFmpeg)

Processing starts automatically when upload **completes**. You do **not** call
`/api/process`.

#### Step 1 — Create upload session

```http
POST /v1/workspaces/{workspaceId}/upload-sessions
Authorization: Bearer …
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "filename": "talk.mp4",
  "contentType": "video/mp4",
  "sizeBytes": 7596767
}
```

→ **201**

```json
{
  "uploadSessionId": "cmr9…",
  "videoId": "vid_d76c…",
  "multipartUploadId": "…",
  "partSizeBytes": 67108864,
  "objectKey": "us/ag_e2e/ws_e2e/vid_d76c…/source.mp4",
  "expiresAt": "2026-07-08T…Z"
}
```

- **`Idempotency-Key` is required** on every POST (fresh UUID per user action).
- Replays with the same key + body return the cached response.

#### Step 2 — Presign parts

```http
POST /v1/upload-sessions/{uploadSessionId}/parts
Authorization: Bearer …
Idempotency-Key: <uuid>
Content-Type: application/json

{ "partNumbers": [1, 2, 3] }
```

→ **200** `{ "parts": [{ "partNumber": 1, "url": "https://…" }], "expiresInSeconds": 3600 }`

Batch part numbers (up to 1000 per request). For large files, request URLs in
chunks.

#### Step 3 — Upload bytes to S3 (browser → S3 directly)

For each part:

```http
PUT {presignedUrl}
Body: <slice of file>
```

Read the **`ETag` response header** (including quotes). The bucket CORS config
**must** expose `ETag` — already set in Terraform. Without it, multipart
complete fails.

#### Step 4 — Complete upload (starts pipeline)

```http
POST /v1/upload-sessions/{uploadSessionId}/complete
Authorization: Bearer …
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "parts": [
    { "partNumber": 1, "etag": "\"abc123…\"" }
  ]
}
```

→ **200**

```json
{
  "videoId": "vid_d76c…",
  "status": "UPLOADED",
  "processingJobId": "job_6443…",
  "processingStatus": "QUEUED"
}
```

**Implementation:** use `uploadVideo()` in `lib/reelifyApi.ts` — it orchestrates
all four steps with ~3-way concurrent part uploads.

---

### Job status (replaces waiting on `/api/process`)

```http
GET /v1/processing-jobs/{jobId}
Authorization: Bearer …
```

→ **200**

```json
{
  "id": "job_6443…",
  "videoId": "vid_d76c…",
  "status": "TRANSCRIBING",
  "pipelineVersion": "v1",
  "cancellationRequested": false,
  "lastError": null,
  "createdAt": "…",
  "updatedAt": "…"
}
```

**Poll every 2–5 s** until terminal:

| Status | UI meaning |
| --- | --- |
| `QUEUED` | Waiting for worker |
| `PROCESSING_AUDIO` | FFmpeg extracting audio |
| `TRANSCRIBING` | ElevenLabs STT |
| `SCORING_CLIPS` | Gemini scoring |
| `COMPLETED` | Fetch results |
| `FAILED` | Show `lastError`; offer retry |
| `CANCELLED` | User/system cancelled |

Optional: `POST /v1/videos/{videoId}/processing-jobs` to (re)create a job if
upload completed but processing failed (idempotent; returns existing active job).

---

### Results (after `COMPLETED`)

#### List videos in workspace

```http
GET /v1/workspaces/{workspaceId}/videos
Authorization: Bearer …
```

→ **200** `{ "videos": [{ "id", "status", "sizeBytes", "durationMs", "createdAt" }] }`

Use for a **library/history** view. Status values include `UPLOADING`, `UPLOADED`,
`PROCESSING`, `READY`, `FAILED`, etc.

#### Transcript

```http
GET /v1/videos/{videoId}/transcript
Authorization: Bearer …
```

→ **200** (when ready)

```json
{
  "id": "…",
  "provider": "elevenlabs",
  "model": "scribe_v2",
  "language": "en",
  "durationMs": 120000,
  "wordCount": 842,
  "text": "Full transcript text…"
}
```

→ **404** `{ "error": "not_found", "message": "no transcript yet" }` while
processing — treat as "not ready", not a hard error.

**Note:** Word-level timing exists in the DB but is **not** exposed by this
endpoint yet. Map `TranscriptSegment[]` in the UI from full text for now, or
add a follow-up API for words if the editor needs timestamps.

#### Clip candidates

```http
GET /v1/videos/{videoId}/clip-candidates
Authorization: Bearer …
```

→ **200**

```json
{
  "candidates": [
    {
      "id": "…",
      "rank": 1,
      "score": 0.92,
      "startMs": 12500,
      "endMs": 45200,
      "durationMs": 32700,
      "title": "The hook moment",
      "category": "engagement"
    }
  ]
}
```

Map to legacy `ClipItem`:

| Legacy field | New source |
| --- | --- |
| `title` | `candidate.title` |
| `duration` | `candidate.durationMs / 1000` |
| `start` / `end` | `startMs / 1000`, `endMs / 1000` |
| `category` | `candidate.category` |
| `transcript` | Slice from transcript text by time (approximate until word API) |
| `url` | **Not available yet** — no rendered clip MP4 in pilot |
| `thumbnail` | **Not available yet** — generate client-side from source video + `startMs` |
| `tags` | **Not in API** — omit or derive from category |

---

## 5. Mapping legacy UI → new backend

Target page: **`app/[locale]/app/page.tsx`** (~2200 lines).

### Remove / stop using

| Legacy | Action |
| --- | --- |
| `@/lib/ffmpegWasm`, `useFFmpeg`, `extractAudioWav` | Remove from upload path |
| `@/lib/videoStorage` (IndexedDB blobs for audio/thumbnails) | Replace with API state + optional local preview only |
| `POST /api/upload` | Replace with upload session flow |
| `POST /api/process` | Replace with job polling + result GETs |
| Direct `GEMINI_API_KEY` / ElevenLabs in client | **Never** — keys stay in AWS Secrets Manager |
| Supabase credit checks in UI | Defer or reimplement against future billing API |

### Suggested new client flow

```
┌─────────────┐     pick file      ┌──────────────────┐
│ Upload UI   │ ─────────────────▶ │ uploadVideo()    │
│ (existing)  │                    │ reelifyApi.ts    │
└─────────────┘                    └────────┬─────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
             create session          PUT parts to S3          complete
                    │                       │                       │
                    └───────────────────────┴───────────┬───────────┘
                                                        ▼
                                              processingJobId
                                                        │
                        ┌───────────────────────────────┘
                        ▼
                 poll GET /processing-jobs/{id}
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     PROCESSING…    COMPLETED       FAILED
          │             │             │
          │             ▼             └── toast + retry
          │      GET transcript
          │      GET clip-candidates
          │             │
          └─────────────┴──▶ existing results UI (adapt ClipItem mapping)
```

### Progress UX

Replace FFmpeg/WASM progress with phases from `lib/reelifyApi.ts`:

1. `creating-session` → `presigning` → `uploading` (parts done/total) → `completing`
2. Then job statuses from the timeline (`StatusTimeline` component was removed —
   rebuild inline or new component matching design system).

### Thumbnails & clip preview

Legacy flow generated thumbnails in-browser after FFmpeg. **Pilot API does not
return rendered clips or thumbnails.** Options:

1. **Client-side:** keep a hidden `<video>` + canvas seek to `startMs` for card
   thumbnails (no upload of thumbnail needed).
2. **Phase 2:** backend artifact URLs when a render pipeline exists.

### Publishing (YouTube/Facebook)

Existing `/api/auth/youtube`, `/api/publish/*` routes are **unchanged** for now.
They still use Google/Facebook OAuth cookies. Clip **files** for publish may not
exist until render pipeline — gate publish UI on artifact availability.

---

## 6. Code you should reuse

### `lib/reelifyApi.ts` (keep & extend)

Already implements:

- Typed client (`createReelifyClient`)
- `uploadVideo(client, workspaceId, file, onProgress)`
- `getProcessingJob`, `getTranscript`, `getClipCandidates`
- Cognito + dev auth headers
- `ReelifyApiError` with `status` + `code`

**Suggested extensions:**

- `listVideos(workspaceId)`
- Token refresh wrapper (Cognito)
- React hooks: `useReelifyClient()`, `useProcessingJob(jobId)`, `useUpload()`

### Example hook sketch

```typescript
// lib/hooks/useReelifyUpload.ts (to be created)
import { useCallback, useState } from "react";
import { createReelifyClient, uploadVideo, type UploadProgress } from "@/lib/reelifyApi";
import { useAuth } from "@/lib/auth/AuthProvider"; // you implement

export function useReelifyUpload(workspaceId: string) {
  const { accessToken } = useAuth();
  const client = createReelifyClient({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE!,
    authMode: "cognito",
    credential: accessToken,
  });
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const upload = useCallback(
    async (file: File) => {
      const { completion } = await uploadVideo(client, workspaceId, file, setProgress);
      return completion;
    },
    [client, workspaceId],
  );

  return { upload, progress };
}
```

---

## 7. Auth provider (to build)

Create something like `lib/auth/AuthProvider.tsx`:

1. On mount, check for valid Cognito session (Amplify or hosted UI callback).
2. Expose `{ accessToken, user, signIn, signOut, isLoading }`.
3. Wrap `app/[locale]/layout.tsx` or a dedicated `(authenticated)` layout.

**Hosted UI login URL (manual test):**

```
https://reelify-auth.auth.us-east-1.amazoncognito.com/login
  ?client_id=2kq0sp03kcp58tphi7e64iqf0t
  &response_type=code
  &scope=openid+email+profile
  &redirect_uri=https://reelify.cc/en/app
```

**Hosted UI sign-up URL:**

```
https://reelify-auth.auth.us-east-1.amazoncognito.com/signup
  ?client_id=2kq0sp03kcp58tphi7e64iqf0t
  &response_type=code
  &scope=openid+email+profile
  &redirect_uri=https://reelify.cc/en/app
```

After OAuth callback, exchange `code` for tokens, then call `POST
/v1/auth/provision` before other API calls.

Update Terraform `cognito_callback_urls` when the callback route is final.

---

## 8. Middleware migration checklist

- [ ] Replace `reelify_user_id` cookie gate with Cognito session check
- [ ] Remove or narrow Supabase usage in `app/login/page.tsx`
- [ ] Ensure `/en/app` works for authenticated Cognito users
- [ ] Keep public routes: `/`, `/en`, `/ar`, `/privacy`, `/terms`, `/login`
- [ ] Optional: API route handlers that still need Supabase — audit separately

---

## 9. Local development

**Option A — API locally, web locally:**

```bash
# Terminal 1: Postgres + env (see services/api README)
npm run dev -w @reelify/api   # :8090, AUTH_MODE=dev

# Terminal 2: Next.js
NEXT_PUBLIC_API_BASE=http://localhost:8090 \
NEXT_PUBLIC_AUTH_MODE=dev \
npm run dev
```

Use header `x-reelify-user: e2e-user` only when API is in dev mode.

**Option B — Web local, API prod:**

Point `NEXT_PUBLIC_API_BASE=https://api.reelify.cc` and use a real Cognito token.
CORS on the API/ALB must allow `http://localhost:3000` for browser uploads to S3
(update `cors_allowed_origins` on the storage module if needed).

**Option C — End-to-end script (no UI):**

```bash
API_BASE=https://api.reelify.cc WORKSPACE_ID=ws_e2e \
DEV_USER=e2e-user FILE=raw-videos-samples/sharks.mp4 \
node scripts/e2e-run.mjs   # dev auth only; prod needs bearer token variant
```

---

## 10. Deploying frontend changes

Web runs on ECS (`reelify-web`). Rebuild with public envs baked in:

```bash
docker build --platform linux/amd64 -f Dockerfile.web \
  --build-arg NEXT_PUBLIC_API_BASE=https://api.reelify.cc \
  --build-arg NEXT_PUBLIC_AUTH_MODE=cognito \
  -t 666730152143.dkr.ecr.us-east-1.amazonaws.com/reelify/web:latest .
docker push 666730152143.dkr.ecr.us-east-1.amazonaws.com/reelify/web:latest
aws ecs update-service --cluster reelify --service reelify-web --force-new-deployment
```

See `docs/RUNBOOK.md` for full ops commands.

---

## 11. Testing checklist

- [ ] Sign in via Cognito; unauthenticated users cannot reach `/en/app`
- [ ] Upload a short MP4 (< 100 MB); progress bar reflects multipart upload
- [ ] Job reaches `COMPLETED`; transcript text renders
- [ ] Clip candidates render with plausible titles/times
- [ ] Failed upload (network error) shows actionable error
- [ ] `FAILED` job shows `lastError`
- [ ] Arabic locale: UI strings via next-intl; transcript language from provider
- [ ] No FFmpeg.wasm loaded on the upload path (check Network tab)
- [ ] No API keys in browser bundle (`grep sk_`, `AIza` in built JS)

---

## 12. Known gaps (coordinate with backend)

| Gap | Impact on FE |
| --- | --- |
| No rendered clip MP4 URLs | Export/publish flows need client-side trim or wait for render API |
| No word-level transcript API | Precise caption overlay may need follow-up endpoint |
| No cancellation endpoint wired | Hide cancel button or add when API exposes it |
| Credits/billing not on new stack | Remove or stub credit UI until billing service exists |
| Single pilot workspace | Hard-code `ws_e2e` or add workspace picker when multi-tenant UI exists |

---

## 13. Related docs

- `docs/PILOT_DEPLOYMENT_LOG.md` — full infra deployment history
- `docs/RUNBOOK.md` — redeploy, logs, DB, tokens
- `docs/DEPLOY_DOMAIN_DYNADOT.md` — DNS delegation
- `lib/reelifyApi.ts` — typed client source of truth
- `services/api/src/routes/*.ts` — server route implementations
