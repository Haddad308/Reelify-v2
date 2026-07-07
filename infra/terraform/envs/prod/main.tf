###############################################################################
# Single lean PRODUCTION environment for the 1-agency pilot.
#
# Cost-lean choices (no scale): public-subnet Fargate (no NAT), no interface
# endpoints, single-AZ RDS, no RDS Proxy, ALB-only (no CloudFront), 1 task each.
#
# Phased apply (see envs/prod/README.md):
#   1. backend_image="" , create_certificate=false  -> core + ECR + zone + ALB
#   2. push image; set backend_image                -> ECS services
#   3. set Dynadot nameservers to route53_nameservers
#   4. create_certificate=true, enable_dns_records=true -> HTTPS + DNS aliases
###############################################################################

locals {
  name = var.project
}

module "network" {
  source = "../../modules/network"

  name       = local.name
  aws_region = var.aws_region
  vpc_cidr   = var.vpc_cidr
  az_count   = 2

  # Cost-lean pilot: no NAT, no interface endpoints. Fargate runs in public
  # subnets; RDS stays private (needs no egress).
  create_nat_gateway         = false
  enable_interface_endpoints = false
}

module "storage" {
  source = "../../modules/storage"

  bucket_name          = var.media_bucket_name
  env                  = var.env
  data_region          = var.data_region
  cors_allowed_origins = var.cors_allowed_origins
  force_destroy        = true
}

module "secrets" {
  source = "../../modules/secrets"

  name        = local.name
  env         = var.env
  data_region = var.data_region
}

module "queue" {
  source = "../../modules/queue"
  name   = local.name
}

module "iam" {
  source = "../../modules/iam"

  name                = local.name
  media_bucket_arn    = module.storage.bucket_arn
  media_kms_key_arn   = module.storage.kms_key_arn
  secrets_kms_key_arn = module.secrets.kms_key_arn
  secret_arns         = module.secrets.secret_arns
  queue_arns          = module.queue.queue_arns
}

module "database" {
  source = "../../modules/database"

  name           = local.name
  aws_region     = var.aws_region
  vpc_id         = module.network.vpc_id
  vpc_cidr       = var.vpc_cidr
  subnet_ids     = module.network.private_subnet_ids
  instance_class = var.db_instance_class
  multi_az       = false
  enable_proxy   = false

  # AWS "Free" account plan caps backup retention.
  backup_retention_days = 1
}

module "registry" {
  source = "../../modules/registry"
  name   = local.name
}

module "dns" {
  source = "../../modules/dns"

  domain             = var.domain
  create_certificate = var.create_certificate
}

module "edge" {
  source = "../../modules/edge"

  name              = local.name
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  enable_https      = var.create_certificate
  certificate_arn   = module.dns.certificate_arn
  hosted_zone_id    = var.enable_dns_records ? module.dns.zone_id : ""
  domain_names      = var.domain_names
}

module "cognito" {
  source = "../../modules/cognito"
  count  = var.enable_cognito ? 1 : 0

  name          = local.name
  callback_urls = var.cognito_callback_urls
  logout_urls   = var.cognito_logout_urls
  domain_prefix = var.cognito_domain_prefix
}

# When AUTH_MODE=cognito the API container needs the pool + client ids.
locals {
  cognito_api_env = var.auth_mode == "cognito" && var.enable_cognito ? [
    { name = "COGNITO_USER_POOL_ID", value = module.cognito[0].user_pool_id },
    { name = "COGNITO_CLIENT_ID", value = module.cognito[0].client_id },
  ] : []
}

# ECS services are created only once a backend image exists in ECR.
module "compute" {
  source = "../../modules/compute"
  count  = var.backend_image == "" ? 0 : 1

  name                  = local.name
  region                = var.aws_region
  vpc_id                = module.network.vpc_id
  public_subnet_ids     = module.network.public_subnet_ids
  alb_security_group_id = module.edge.alb_security_group_id

  backend_image = var.backend_image
  web_image     = var.web_image

  execution_role_arn   = module.iam.execution_role_arn
  task_role_arns       = module.iam.task_role_arns
  api_target_group_arn = module.edge.api_target_group_arn
  web_target_group_arn = module.edge.web_target_group_arn

  secret_arns  = module.secrets.secret_arns
  queue_urls   = module.queue.queue_urls
  media_bucket = module.storage.bucket_id

  auth_mode     = var.auth_mode
  gemini_model  = var.gemini_model
  api_extra_env = local.cognito_api_env
}

# ---------------------------------------------------------------------------
# Ops: one monthly cost budget. Notifications are added only when an email is
# supplied (a budget notification requires at least one subscriber).
# ---------------------------------------------------------------------------
resource "aws_budgets_budget" "monthly" {
  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_limit_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  dynamic "notification" {
    for_each = var.budget_alert_email == "" ? [] : [80, 100, 120]
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_alert_email]
    }
  }
}
