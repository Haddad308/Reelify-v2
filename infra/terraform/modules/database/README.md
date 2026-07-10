# Module: database

RDS PostgreSQL (plan §3, §8).

- **Managed master password**: `manage_master_user_password = true`, so the
  master credentials live in an RDS-managed Secrets Manager secret — never in
  Terraform state. `master_user_secret_arn` is exported.
- **Private**: no public access; security group allows 5432 only from the VPC
  CIDR; instances live in private subnets.
- **Encrypted at rest** (gp3), automated backups, storage autoscaling.
- **Multi-AZ** via `multi_az` (enable in prod).
- **RDS Proxy** via `enable_proxy` (connection pooling). Off by default for dev
  cost; dev pools at the app layer (Prisma). Enable in prod.

## Building the app DATABASE_URL

After apply, read the RDS-managed secret + endpoint and store the app URL in the
`reelify-<env>/database/url` Secrets Manager secret (out-of-band), then run
`@reelify/db`'s `migrate:deploy`.

## Outputs

`instance_identifier`, `endpoint`, `port`, `db_name`, `security_group_id`,
`master_user_secret_arn`.
