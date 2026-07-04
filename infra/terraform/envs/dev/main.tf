locals {
  name = "${var.project}-${var.env}"
}

module "network" {
  source = "../../modules/network"

  name       = local.name
  aws_region = var.aws_region
  vpc_cidr   = var.vpc_cidr
  az_count   = var.az_count

  # Dev cost defaults: one shared NAT, interface endpoints on for private AWS API access.
  single_nat_gateway         = true
  enable_interface_endpoints = true
}

module "storage" {
  source = "../../modules/storage"

  bucket_name          = var.media_bucket_name
  env                  = var.env
  data_region          = var.data_region
  cors_allowed_origins = var.cors_allowed_origins

  # Dev convenience: allow `terraform destroy` to remove a non-empty bucket.
  force_destroy = true
}

module "secrets" {
  source = "../../modules/secrets"

  name        = local.name
  env         = var.env
  data_region = var.data_region
  # Values are set out-of-band via `aws secretsmanager put-secret-value`.
}

module "queue" {
  source = "../../modules/queue"

  name = local.name
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

  name       = local.name
  aws_region = var.aws_region
  vpc_id     = module.network.vpc_id
  vpc_cidr   = var.vpc_cidr
  subnet_ids = module.network.private_subnet_ids

  # Dev sizing: smallest burstable instance, single-AZ, no proxy (app pools).
  instance_class = var.db_instance_class
  multi_az       = false
  enable_proxy   = false
}
