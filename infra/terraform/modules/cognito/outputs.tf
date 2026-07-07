output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "client_id" {
  value = aws_cognito_user_pool_client.this.id
}

output "hosted_ui_domain" {
  description = "Hosted UI base domain (prefix only; full host is <prefix>.auth.<region>.amazoncognito.com)."
  value       = aws_cognito_user_pool_domain.this.domain
}
