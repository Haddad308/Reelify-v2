output "alb_dns_name" {
  description = "Public DNS name of the ALB."
  value       = aws_lb.this.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone id (for Route53 alias)."
  value       = aws_lb.this.zone_id
}

output "alb_security_group_id" {
  description = "ALB security group id (allow this on the ECS task SG)."
  value       = aws_security_group.alb.id
}

output "api_target_group_arn" {
  description = "Target group ARN for the API service."
  value       = aws_lb_target_group.api.arn
}

output "web_target_group_arn" {
  description = "Target group ARN for the web service."
  value       = aws_lb_target_group.web.arn
}
