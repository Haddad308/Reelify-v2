output "kms_key_arn" {
  description = "KMS key ARN protecting the secrets."
  value       = aws_kms_key.secrets.arn
}

output "secret_arns" {
  description = "Map of logical secret name -> Secrets Manager ARN."
  value       = { for name, secret in aws_secretsmanager_secret.this : name => secret.arn }
}
