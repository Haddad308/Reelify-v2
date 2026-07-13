# CI/CD

GitHub Actions runs **CI on every PR/push** and **deploys to AWS ECS on merge to
`master`**. No long-lived AWS keys in GitHub — deploy uses OIDC to assume a
scoped IAM role.

## Workflows

| Workflow | File | Trigger | What it does |
| --- | --- | --- | --- |
| **CI** | `.github/workflows/ci.yml` | PR + push to `master` | `npm ci`, Prisma generate, typecheck, unit tests, Next.js build, Docker build smoke test |
| **Deploy** | `.github/workflows/deploy.yml` | Push to `master`, manual | Build/push backend + web images to ECR, force ECS redeploy, health check |

## One-time setup

### 1. Apply the GitHub OIDC IAM role (Terraform)

From a shell with AWS credentials for account `666730152143`:

```bash
cd infra/terraform/envs/prod
terraform init
terraform apply -target=module.github_actions
```

Note the output:

```text
github_deploy_role_arn = arn:aws:iam::666730152143:role/reelify-github-deploy
```

If the GitHub OIDC provider already exists in the account, set
`create_oidc_provider = false` in the module call (or import the existing
provider) before apply.

### 2. Configure GitHub

In **GitHub → reelify → Settings → Environments**, create an environment named
`production` (optional but recommended — the deploy workflow references it).

In **Settings → Secrets and variables → Actions → Variables**, add:

| Variable | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw github_deploy_role_arn` |

No AWS access keys are required.

### 3. Push the workflows

Merge `.github/workflows/*` to `master`. The first deploy run starts after that
push (or trigger **Deploy → Run workflow** manually).

## What deploy does

Mirrors `docs/RUNBOOK.md` redeploy steps, automated:

1. Build `Dockerfile.backend` and `Dockerfile.web` for `linux/amd64`
2. Push to ECR as `:latest` and `:sha`
3. `aws ecs update-service --force-new-deployment` for:
   - `reelify-api`
   - `reelify-ffmpeg`
   - `reelify-light`
   - `reelify-web`
4. Wait for services to stabilize
5. Hit `https://api.reelify.cc/v1/healthz` and `https://reelify.cc/en/app`

## Manual deploy

**Actions → Deploy → Run workflow** on `master`. Use **Skip post-deploy health
checks** if you only want image push + ECS rollout.

## Database migrations

Migrations are **not** run automatically (RDS is private; one-off ECS task is
safer to run deliberately). After a schema change, run from `docs/RUNBOOK.md`:

```bash
aws ecs run-task ... npx prisma migrate deploy ...
```

## Local parity

```bash
npm install -g npm@11 && npm ci
npx prisma generate --schema db/schema.prisma
npm run ci   # typecheck + test + build
```

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Deploy: `Not authorized to perform sts:AssumeRoleWithWebIdentity` | Missing/wrong `AWS_DEPLOY_ROLE_ARN` or branch not in OIDC trust | Set variable; ensure push is to `master` |
| Deploy: ECR push denied | Role policy or repo ARN mismatch | Re-apply `module.github_actions` |
| CI build fails on Sentry | Source map upload without token | CI sets `SENTRY_AUTH_TOKEN=""` to skip upload |
| ECS tasks `exec format error` | Wrong CPU arch | Workflows always build `linux/amd64` |
