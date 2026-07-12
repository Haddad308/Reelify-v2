# Reelify AWS Cost Report

**Generated:** 2026-07-10 (UTC+3)  
**AWS Account:** `666730152143`  
**Region:** `us-east-1`  
**Period:** 2026-07-01 – 2026-07-31  
**Data sources:** AWS Cost Explorer API, AWS Budgets API, live resource inventory

---

## Total Cost

| | Amount |
| --- | ---: |
| **Total usage cost (matches Cost Explorer console)** | **$28.23** |
| Credits applied | −$28.23 |
| **Net amount billed to card** | **$0.00** |

| | Per Day | Per Month |
| --- | ---: | ---: |
| **Actual usage (Jul 5–10, 6 days)** | **$4.71 avg** | **$28.23 MTD** |
| **Projected at current run-rate** | **~$4.86** | **~$146** |

> The **$28.23** figure is what AWS Cost Explorer shows as "Total cost." It is **gross usage** before promotional/AWS credits. Credits currently offset 100% of usage, so the net bill is $0.00.

---

## Executive Summary

| Metric | Value |
| --- | --- |
| **Total usage cost (July MTD)** | **$28.23** |
| **Net billed (after credits)** | **$0.00** |
| **Average daily usage cost** | **$4.71/day** (over 6 active days) |
| **Projected full-month usage** | **~$146/month** at current run-rate |
| **Budget** | $0.00 net / $60.00 limit (`reelify-monthly`) |
| **Running Fargate tasks** | 4 (api, web, ffmpeg, light) |

---

## 1. Actual Daily Usage Costs

| Date | Usage (USD) | Notes |
| --- | ---: | --- |
| 2026-07-05 | $4.18 | Infra provisioning begins |
| 2026-07-06 | $4.95 | RDS + ECS services deployed |
| 2026-07-07 | $8.19 | Highest day (VPC endpoints + full stack) |
| 2026-07-08 | $4.86 | Steady-state |
| 2026-07-09 | $4.86 | Steady-state |
| 2026-07-10 | $1.19 | Partial day |
| | | |
| **TOTAL** | **$28.23** | |

---

## 2. Actual Cost by Service (July MTD)

| AWS Service | Usage (USD) | % of Total |
| --- | ---: | ---: |
| Amazon Virtual Private Cloud | $10.46 | 37% |
| Amazon Elastic Container Service (Fargate) | $9.66 | 34% |
| EC2 - Other | $2.97 | 11% |
| Amazon Relational Database Service | $2.05 | 7% |
| Amazon Elastic Load Balancing | $1.87 | 7% |
| Amazon Route 53 | $0.50 | 2% |
| AWS Key Management Service | $0.39 | 1% |
| AWS Secrets Manager | $0.30 | 1% |
| Amazon EC2 Container Registry (ECR) | $0.02 | <1% |
| Amazon Simple Storage Service | $0.00 | <1% |
| | | |
| **TOTAL** | **$28.23** | **100%** |

### VPC cost breakdown ($10.46)

| Usage type | Cost | Notes |
| --- | ---: | --- |
| VPC Interface Endpoints | $7.80 | Private AWS API access (S3, ECR, etc.) |
| Public IPv4 addresses | $2.66 | ALB + ECS task public IPs |

> VPC is the **largest cost driver** (37%), not Fargate. Interface endpoints at ~$0.01/hr each add up quickly. Removing unused endpoints would be the highest-impact optimization.

---

## 3. Credits vs. Net Bill

| Record Type | Amount |
| --- | ---: |
| Usage | +$28.23 |
| Credits | −$28.23 |
| **Net billed** | **~$0.00** |

AWS promotional / Free Tier credits are currently covering all usage. Once credits expire, you will be charged the full **~$4.86/day (~$146/month)** run-rate unless resources are optimized.

---

## 4. Current Resource Inventory

| Category | Resource | Details |
| --- | --- | --- |
| **Compute** | ECS cluster `reelify` | 4 Fargate services, 4 running tasks |
| **Load Balancing** | ALB `reelify-alb` | Public, HTTPS, routes web + API |
| **Database** | RDS `reelify-pg` | PostgreSQL, `db.t4g.micro`, 20 GB gp3, Single-AZ |
| **Storage** | S3 `reelify-media-us` | ~17.4 MB (media) |
| **Storage** | S3 `reelify-tfstate-666730152143` | ~3.7 MB (Terraform state) |
| **Queues** | SQS | 3 work queues + 3 DLQs |
| **Registry** | ECR | `reelify/backend`, `reelify/web` |
| **Auth** | Cognito | User pool `reelify-users` |
| **DNS** | Route 53 | Zone `reelify.cc` (6 records) |
| **Secrets** | Secrets Manager | 3 secrets |
| **Logs** | CloudWatch | `/ecs/reelify` (14-day retention) |
| **Network** | VPC Endpoints | Interface endpoints (~$7.80 MTD) |
| **Network** | NAT Gateway | None |

---

## 5. Budget Status

| Setting | Value |
| --- | --- |
| Budget name | `reelify-monthly` |
| Limit | $60.00 USD / month |
| Net actual spend (July) | $0.00 (credits cover usage) |
| Gross usage (July MTD) | $28.23 |
| Projected monthly usage | ~$146 (exceeds $60 budget) |
| Health | **HEALTHY** (based on net spend) |

---

## 6. Cost Optimization Opportunities

| Action | Est. savings | Priority |
| --- | ---: | ---: |
| Remove unused VPC interface endpoints | ~$7.80/month (already spent MTD) | **High** |
| Scale `reelify-ffmpeg` to 0 when idle | ~$1.60/day when idle | Medium |
| Move workers to Fargate Spot | ~30–70% on Fargate | Medium |
| Reduce task sizes (0.25 vCPU / 512 MB) | ~$0.30/day per task | Low |

Already in place:
- No NAT Gateway
- Single-AZ RDS, smallest instance class
- Consolidated light worker (3 roles in 1 task)
- 14-day CloudWatch log retention

---

## 7. Methodology

1. **Usage costs** = `aws ce get-cost-and-usage` filtered to `RECORD_TYPE = Usage` (matches Cost Explorer "Total cost").
2. **Net billed** = Usage + Credits (promotional credits currently offset all usage).
3. **Daily breakdown** = same API with `DAILY` granularity, `Usage` filter only.
4. **Excluded:** External API costs (ElevenLabs, Gemini) — not AWS charges.

### Refresh commands

```bash
# Total usage cost (matches console)
aws ce get-cost-and-usage \
  --time-period Start=2026-07-01,End=2026-08-01 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --filter '{"Dimensions":{"Key":"RECORD_TYPE","Values":["Usage"]}}'

# Daily usage breakdown
aws ce get-cost-and-usage \
  --time-period Start=2026-07-01,End=2026-08-01 \
  --granularity DAILY \
  --metrics UnblendedCost \
  --filter '{"Dimensions":{"Key":"RECORD_TYPE","Values":["Usage"]}}'

# By service
aws ce get-cost-and-usage \
  --time-period Start=2026-07-01,End=2026-08-01 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --filter '{"Dimensions":{"Key":"RECORD_TYPE","Values":["Usage"]}}' \
  --group-by Type=DIMENSION,Key=SERVICE
```

---

*Report generated from live AWS Cost Explorer data. The $28.23 total matches the AWS Billing console for July 2026.*
