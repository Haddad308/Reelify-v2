# Terraform state backend bootstrap

Creates the S3 bucket + DynamoDB lock table used as the remote backend by every
environment root under `../envs/*`.

This config intentionally uses **local state** (it cannot store its own state in
a backend it hasn't created yet). Run it once per AWS account.

```bash
terraform init
terraform apply
```

Outputs:

- `state_bucket_name` — e.g. `reelify-tfstate-<account-id>`
- `lock_table_name`   — e.g. `reelify-tf-locks`

Plug those into each `envs/<env>/backend.tf`. The S3 bucket has versioning,
SSE-S3 encryption, full public-access block, a TLS-only bucket policy, and
`prevent_destroy` so it can't be torn down by accident.
