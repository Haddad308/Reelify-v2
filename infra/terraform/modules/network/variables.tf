variable "name" {
  description = "Name prefix for network resources (e.g. reelify-dev)."
  type        = string
}

variable "aws_region" {
  description = "AWS region (used to build VPC endpoint service names)."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of Availability Zones to spread subnets across (>=2)."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2
    error_message = "az_count must be at least 2 for multi-AZ resilience."
  }
}

variable "single_nat_gateway" {
  description = "Use one shared NAT gateway (cheaper, dev) instead of one per AZ (HA, prod)."
  type        = bool
  default     = true
}

variable "enable_interface_endpoints" {
  description = "Create interface VPC endpoints (SQS/Secrets Manager/ECR/CloudWatch/KMS)."
  type        = bool
  default     = true
}

variable "interface_endpoints" {
  description = "Service short-names for interface endpoints."
  type        = list(string)
  default     = ["sqs", "secretsmanager", "ecr.api", "ecr.dkr", "logs", "kms"]
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}
