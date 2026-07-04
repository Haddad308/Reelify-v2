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
