output "vpc_id" {
  description = "Dev VPC id."
  value       = module.network.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet ids (ECS tasks, workers, RDS)."
  value       = module.network.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet ids (NAT, ALB)."
  value       = module.network.public_subnet_ids
}

output "media_bucket_name" {
  description = "Media bucket for the us data plane."
  value       = module.storage.bucket_id
}

output "media_kms_key_arn" {
  description = "KMS key protecting media at rest."
  value       = module.storage.kms_key_arn
}
