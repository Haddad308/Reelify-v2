# Reelify Infrastructure (Terraform)

All Reelify AWS infrastructure is managed here. No console click-ops, no ad-hoc
CLI provisioning. If a resource exists, it exists in Terraform.

## Layout

```text
infra/terraform/
  bootstrap/            # one-time: creates the remote-state backend (S3 + DynamoDB).
                        # Uses LOCAL state (chicken-and-egg). Run once per account.
  modules/              # reusable, composable building blocks (one per bounded component)
    network/            # VPC, subnets (>=2 AZ), NAT, VPC endpoints
    storage/            # private S3 media bucket(s): versioning, SSE-KMS, lifecycle, CORS
    database/           # (later) RDS PostgreSQL + RDS Proxy
    queue/              # (later) SQS work queues + DLQs
    compute/            # (later) ECS cluster + Fargate services (API, dispatcher, workers)
    registry/           # (later) ECR repositories
    iam/                # (later) least-privilege task roles
    secrets/            # (later) Secrets Manager + KMS
    observability/      # (later) CloudWatch, alarms, OTel, dashboards
    edge/               # (later) API Gateway/ALB + WAF
    web/                # (later) Next.js on ECS Fargate + CloudFront
  envs/                 # thin environment roots (independently plan/apply-able)
    dev/                # remote state, calls modules
    staging/            # (later)
    prod/               # (later)
```

## Conventions

- Remote state in S3 with DynamoDB locking, per-environment state keys.
- Pinned provider + module versions. `terraform fmt`, `validate`, and `tflint` clean.
- Consistent tags on every resource: `app=reelify`, `env`, `data_region`,
  `component`, `managed_by=terraform`.
- Region + `data_region` parameterized so a second regional data plane can be
  added later without rewrites.
- Every module ships `variables.tf`, `outputs.tf`, and a short README.

## First-time setup

```bash
# 1. Create the remote-state backend (once per AWS account)
cd bootstrap
terraform init
terraform apply

# 2. Stand up an environment
cd ../envs/dev
terraform init      # uses the S3 backend created above
terraform plan
terraform apply
```

## Phasing

Terraform grows with the delivery phases. Phase 1 provisions: `network`,
`storage`, `database`, `queue`, `compute` (API + one FFmpeg worker + integration
workers), `web`, `registry`, `iam`, `secrets`, and baseline `observability`.
Module boundaries are designed so Phase 2/3 additions (autoscaling, watchdog,
extra worker pools, cross-region snapshots) slot in without refactoring.
