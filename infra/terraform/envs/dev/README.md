# Environment: dev

Thin root that composes modules for the `dev` environment. State is stored in
the shared S3 backend created by `../../bootstrap`.

```bash
terraform init
terraform plan
terraform apply
```

## What this provisions (Phase 1, incremental)

- `network` — VPC (`10.0.0.0/16`), 2 public + 2 private subnets across 2 AZs,
  one shared NAT gateway, S3 gateway endpoint, and interface endpoints
  (SQS/Secrets Manager/ECR/CloudWatch/KMS).
- `storage` — private `reelify-media-us-dev` bucket (versioned, SSE-KMS,
  lifecycle, CORS for browser multipart uploads).

Additional Phase 1 modules (`database`, `queue`, `compute`, `registry`, `iam`,
`secrets`, `observability`, `edge`, `web`) are added incrementally.

## Cost note

The NAT gateway and interface endpoints are the standing-cost items here
(roughly a few tens of USD/month for a single-NAT dev VPC). Run `terraform plan`
and review before `apply`.
