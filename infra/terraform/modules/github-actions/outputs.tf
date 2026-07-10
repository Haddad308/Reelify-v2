output "deploy_role_arn" {
  description = "IAM role ARN for GitHub Actions (set as repo variable AWS_DEPLOY_ROLE_ARN)."
  value       = aws_iam_role.deploy.arn
}

output "deploy_role_name" {
  value = aws_iam_role.deploy.name
}

output "oidc_provider_arn" {
  value = local.oidc_provider_arn
}
