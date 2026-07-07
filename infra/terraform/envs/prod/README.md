# Environment: prod (single lean pilot stack)

The one and only Reelify environment. Cost-lean for a 1-agency pilot: public
subnet Fargate (no NAT), no interface endpoints, single-AZ RDS, no RDS Proxy,
ALB-only (no CloudFront), one task per service.

## Phased deploy

```bash
export AWS_REGION=us-east-1
terraform init

# Phase 1 — core infra + ECR + Route53 zone + ALB (HTTP)
terraform apply
#  -> note outputs: ecr_backend_url, route53_nameservers, alb_dns_name

# Phase 2 — build & push the backend image, then bring up ECS
#  docker build --platform linux/amd64 -f Dockerfile.backend -t <ecr_backend_url>:latest .
#  (docker login to ECR; docker push)
terraform apply -var="backend_image=<ecr_backend_url>:latest"
#  -> test: curl http://<alb_dns_name>/v1/healthz

# Phase 3 — point Dynadot nameservers at route53_nameservers (see
#            docs/DEPLOY_DOMAIN_DYNADOT.md), wait for propagation.

# Phase 4 — HTTPS + DNS aliases (+ web image once built)
terraform apply \
  -var="backend_image=<ecr_backend_url>:latest" \
  -var="web_image=<ecr_web_url>:latest" \
  -var="create_certificate=true" \
  -var="enable_dns_records=true"
```

Put non-secret overrides in `terraform.tfvars` (gitignored) if preferred.

## Retiring the old dev stack

The earlier `envs/dev` stack is superseded by this one. Destroy it to stop its
NAT/endpoint costs: `cd ../dev && terraform destroy`.
