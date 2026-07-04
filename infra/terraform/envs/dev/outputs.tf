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

output "secret_arns" {
  description = "Secrets Manager ARNs (containers; values set out-of-band)."
  value       = module.secrets.secret_arns
}

output "secrets_kms_key_arn" {
  description = "KMS key protecting secrets."
  value       = module.secrets.kms_key_arn
}

output "queue_urls" {
  description = "SQS work queue URLs by class."
  value       = module.queue.queue_urls
}

output "dlq_urls" {
  description = "SQS dead-letter queue URLs by class."
  value       = module.queue.dlq_urls
}

output "execution_role_arn" {
  description = "Shared ECS task execution role ARN."
  value       = module.iam.execution_role_arn
}

output "task_role_arns" {
  description = "Per-service ECS task role ARNs."
  value       = module.iam.task_role_arns
}
