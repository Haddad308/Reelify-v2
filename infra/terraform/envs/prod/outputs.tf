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

output "cognito_user_pool_id" {
  value = var.enable_cognito ? module.cognito[0].user_pool_id : ""
}

output "cognito_client_id" {
  value = var.enable_cognito ? module.cognito[0].client_id : ""
}

output "cognito_hosted_ui_domain" {
  value = var.enable_cognito ? module.cognito[0].hosted_ui_domain : ""
}

output "cognito_hosted_ui_base_url" {
  description = "Cognito Hosted UI base URL (login + sign-up pages)."
  value       = var.enable_cognito ? "https://${var.cognito_domain_prefix}.auth.${var.aws_region}.amazoncognito.com" : ""
}

output "cognito_hosted_ui_signup_url" {
  description = "Pre-built Hosted UI sign-up URL for the primary callback."
  value = var.enable_cognito ? format(
    "https://%s.auth.%s.amazoncognito.com/signup?client_id=%s&response_type=code&scope=openid+email+profile&redirect_uri=%s",
    var.cognito_domain_prefix,
    var.aws_region,
    module.cognito[0].client_id,
    urlencode(var.cognito_callback_urls[0]),
  ) : ""
}

output "github_deploy_role_arn" {
  description = "Set as GitHub repo variable AWS_DEPLOY_ROLE_ARN for the deploy workflow."
  value       = var.enable_github_actions ? module.github_actions[0].deploy_role_arn : ""
}
