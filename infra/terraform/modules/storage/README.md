# Module: storage

Private S3 media bucket for a single data plane (e.g. `us`). One module
instance per `data_region`.

Enforces the plan §11/§14 controls:

- **Private**: full public-access block + `BucketOwnerEnforced` (ACLs off).
- **Encrypted**: SSE-KMS. Creates a dedicated, rotating KMS key unless you pass
  an existing `kms_key_arn`.
- **Versioned**: object versioning on; noncurrent versions expire.
- **Lifecycle**:
  - abort incomplete multipart uploads (`multipart_abort_days`, default 7)
  - expire derived audio under `audio/` (`audio_expiry_days`, default 30)
  - tier `originals/` to cheaper storage after the hot window
    (`originals_transition_days`, default 90 → `INTELLIGENT_TIERING`)
- **CORS**: allows browser → S3 multipart `PUT/POST/GET/HEAD` from
  `cors_allowed_origins` and exposes `ETag` so the browser can complete uploads.
- **TLS-only**: bucket policy denies non-HTTPS access.

## Key prefixes (convention)

- `originals/{agency_id}/{video_asset_id}/...` — uploaded source video
- `audio/{agency_id}/{video_asset_id}/...`     — extracted audio artifact

Object keys are tenant-scoped but are **never** used as the authorization check
(authz happens at identity/app/DB layers — plan §11).

## Outputs

`bucket_id`, `bucket_arn`, `bucket_regional_domain_name`, `kms_key_arn`.
