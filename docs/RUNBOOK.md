# Reelify pilot runbook

One lean production stack in AWS account `666730152143`, region `us-east-1`.
Everything is Terraform-managed under `infra/terraform/envs/prod`. No console
click-ops.

## At a glance

| Thing | Value |
| --- | --- |
| Web app | `https://reelify.cc` (and `www.`) |
| API | `https://api.reelify.cc/v1/*` |
| Auth | Cognito (`AUTH_MODE=cognito`); pool + client in TF outputs |
| Cluster | ECS `reelify` (services: `reelify-api`, `reelify-ffmpeg`, `reelify-light`, `reelify-web`) |
| DB | RDS `reelify-pg` (private; Postgres) |
| Bucket | `reelify-media-us` |
| Queues | `reelify-extraction` / `-transcription` / `-scoring` (+ DLQs) |
| Logs | CloudWatch `/ecs/reelify` (14-day retention) |
| Budget | `reelify-monthly` (set `budget_alert_email` to get emails) |

Pipeline: upload → `reelify-ffmpeg` (extract audio) → `reelify-light`
(dispatcher + transcription + scoring co-located). One backend image
(`Dockerfile.backend`) serves api/ffmpeg/light via command override.

## Credentials

AWS access is via `aws login` (temporary session that expires). Before any
Terraform/ECR/ECS command, refresh env creds for the shell:

```bash
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
eval "$(aws configure export-credentials --format env)"
export AWS_REGION=us-east-1
```

If `aws sts get-caller-identity` fails, re-run `aws login` in a terminal.

## Redeploy after a code change

**Automated (preferred):** merge to `master` — GitHub Actions deploys to ECS. See
`docs/CI_CD.md`.

**Manual:**

```bash
# 1) Backend (api/ffmpeg/light) — build x86_64, push, force new deployments
ECR=666730152143.dkr.ecr.us-east-1.amazonaws.com/reelify/backend
aws ecr get-login-password | docker login --username AWS --password-stdin 666730152143.dkr.ecr.us-east-1.amazonaws.com
docker build --platform linux/amd64 -f Dockerfile.backend -t $ECR:latest .
docker push $ECR:latest
for s in reelify-api reelify-ffmpeg reelify-light; do
  aws ecs update-service --cluster reelify --service $s --force-new-deployment >/dev/null
done

# 2) Web — build with the public envs baked in, push, redeploy
WEB=666730152143.dkr.ecr.us-east-1.amazonaws.com/reelify/web
docker build --platform linux/amd64 -f Dockerfile.web \
  --build-arg NEXT_PUBLIC_API_BASE=https://api.reelify.cc \
  --build-arg NEXT_PUBLIC_AUTH_MODE=cognito \
  --build-arg NEXT_PUBLIC_PILOT_WORKSPACE_ID=ws_e2e \
  -t $WEB:latest .
docker push $WEB:latest
aws ecs update-service --cluster reelify --service reelify-web --force-new-deployment >/dev/null
```

> Fargate is x86_64 — always build with `--platform linux/amd64` (an ARM image
> fails at runtime with `exec format error`).

## Infra changes

```bash
cd infra/terraform/envs/prod
terraform plan
terraform apply \
  -var='backend_image=666730152143.dkr.ecr.us-east-1.amazonaws.com/reelify/backend:latest' \
  -var='web_image=666730152143.dkr.ecr.us-east-1.amazonaws.com/reelify/web:latest' \
  -var='create_certificate=true' -var='enable_dns_records=true' \
  -var='enable_cognito=true' -var='auth_mode=cognito'
```

Put these in `terraform.tfvars` (gitignored) to avoid retyping.

## Tail logs

```bash
aws logs tail /ecs/reelify --follow --format short          # all services
aws logs tail /ecs/reelify --since 15m --format short | rg -i error
```

## Database

RDS is private (no public access). Run SQL / migrations from inside the VPC as a
one-off ECS task on the API task definition:

```bash
TD=$(aws ecs describe-services --cluster reelify --services reelify-api --query 'services[0].taskDefinition' --output text)
NET=$(aws ecs describe-services --cluster reelify --services reelify-api --query 'services[0].networkConfiguration' --output json)
# migrations:
aws ecs run-task --cluster reelify --launch-type FARGATE --task-definition "$TD" \
  --network-configuration "$NET" \
  --overrides '{"containerOverrides":[{"name":"api","command":["npx","prisma","migrate","deploy","--schema","db/schema.prisma"]}]}'
```

The app `DATABASE_URL` lives in Secrets Manager (`reelify/database/url`); the
RDS master password is in an RDS-managed secret (never in Terraform state).

## Peek at a DLQ (stuck messages)

```bash
for q in extraction transcription scoring; do
  url=https://sqs.us-east-1.amazonaws.com/666730152143/reelify-$q-dlq
  echo "$q-dlq: $(aws sqs get-queue-attributes --queue-url $url \
    --attribute-names ApproximateNumberOfMessages \
    --query 'Attributes.ApproximateNumberOfMessages' --output text)"
done
```

## Auth: mint an access token for the owner

```bash
CLIENT=$(cd infra/terraform/envs/prod && terraform output -raw cognito_client_id)
aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id "$CLIENT" \
  --auth-parameters USERNAME=owner@reelify.cc,PASSWORD='<password>' \
  --query 'AuthenticationResult.AccessToken' --output text
```

Paste the token into the Studio page's "Bearer token" field. New users:
`aws cognito-idp admin-create-user` + `admin-set-user-password --permanent`, then
add a matching row in `users` (`authSubject` = the Cognito `sub`) and an
`agency_users` membership.

## Health checks

```bash
curl -s https://api.reelify.cc/v1/healthz          # {"status":"ok"}
curl -s -o /dev/null -w '%{http_code}\n' https://reelify.cc/en/app
```

## Not enabled for the pilot (defer to ~10 agencies)

Autoscaling, multi-AZ RDS, RDS Proxy, NAT/interface endpoints, CloudFront, WAF,
a queue watchdog. Add these when scaling beyond one agency.
