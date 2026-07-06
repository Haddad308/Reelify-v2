output "zone_id" {
  description = "Route53 hosted zone id."
  value       = aws_route53_zone.this.zone_id
}

output "nameservers" {
  description = "Set these as the custom nameservers at Dynadot."
  value       = aws_route53_zone.this.name_servers
}

output "certificate_arn" {
  description = "Validated ACM cert ARN (empty until create_certificate = true)."
  value       = var.create_certificate ? aws_acm_certificate_validation.this[0].certificate_arn : ""
}
