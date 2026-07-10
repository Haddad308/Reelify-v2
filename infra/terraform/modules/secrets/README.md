# Module: secrets

A regional KMS key plus Secrets Manager **containers** for the provider keys and
database URL (plan §11 secrets).

Terraform manages the KMS key and the secret containers. Secret **values** are
intentionally kept out of state — set them out-of-band:

```bash
aws secretsmanager put-secret-value \
  --secret-id reelify-dev/provider/gemini \
  --secret-string "$GEMINI_API_KEY"
```

Values are never managed by Terraform, so they never land in state.

## Outputs

- `kms_key_arn` — key protecting the secrets (also usable by task roles).
- `secret_arns` — `{ "provider/gemini" = "arn:aws:secretsmanager:...", ... }`,
  consumed by the `iam` module to grant least-privilege read access.
