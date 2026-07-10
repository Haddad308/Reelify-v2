output "vpc_id" {
  description = "VPC id."
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "VPC CIDR block."
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet ids."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet ids (workers, RDS, ECS tasks live here)."
  value       = aws_subnet.private[*].id
}

output "availability_zones" {
  description = "AZs the subnets span."
  value       = local.azs
}

output "nat_gateway_ids" {
  description = "NAT gateway ids."
  value       = aws_nat_gateway.this[*].id
}

output "endpoint_security_group_id" {
  description = "Security group id used by interface VPC endpoints (null if disabled)."
  value       = var.enable_interface_endpoints ? aws_security_group.endpoints[0].id : null
}
