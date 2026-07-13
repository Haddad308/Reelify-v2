output "instance_identifier" {
  description = "RDS instance identifier."
  value       = aws_db_instance.this.identifier
}

output "endpoint" {
  description = "Connection endpoint (RDS Proxy endpoint when enabled, else the instance address)."
  value       = var.enable_proxy ? aws_db_proxy.this[0].endpoint : aws_db_instance.this.address
}

output "port" {
  description = "Postgres port."
  value       = aws_db_instance.this.port
}

output "db_name" {
  description = "Initial database name."
  value       = aws_db_instance.this.db_name
}

output "security_group_id" {
  description = "RDS security group id."
  value       = aws_security_group.rds.id
}

output "master_user_secret_arn" {
  description = "ARN of the RDS-managed master user secret (username/password)."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}
