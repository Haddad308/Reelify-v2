output "alb_dns_name" {
  description = "Public ALB DNS (test the pipeline here before the domain is live)."
  value       = module.edge.alb_dns_name
}

output "route53_nameservers" {
  description = "Set these as the custom nameservers at Dynadot."
  value       = module.dns.nameservers
}

output "ecr_backend_url" {
  description = "ECR repo URL for the backend image."
  value       = module.registry.repository_urls["backend"]
}

output "ecr_web_url" {
  description = "ECR repo URL for the web image."
  value       = module.registry.repository_urls["web"]
}

output "media_bucket" {
  value = module.storage.bucket_id
}

output "db_endpoint" {
  value = module.database.endpoint
}

output "db_master_user_secret_arn" {
  value = module.database.master_user_secret_arn
}

output "queue_urls" {
  value = module.queue.queue_urls
}

output "secret_arns" {
  value = module.secrets.secret_arns
}

output "certificate_arn" {
  value = module.dns.certificate_arn
}
