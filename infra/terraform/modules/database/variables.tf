variable "name" {
  description = "Name prefix (e.g. reelify-dev)."
  type        = string
}

variable "aws_region" {
  description = "AWS region (used in the proxy KMS condition)."
  type        = string
}

variable "vpc_id" {
  description = "VPC id the RDS security group lives in."
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR allowed to reach Postgres on 5432."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet ids for the DB subnet group / proxy."
  type        = list(string)
}

variable "engine_version" {
  description = "PostgreSQL major/minor version."
  type        = string
  default     = "16"
}

variable "instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Initial storage (GiB)."
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Storage autoscaling ceiling (GiB)."
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "reelify"
}

variable "master_username" {
  description = "Master username."
  type        = string
  default     = "reelify"
}

variable "multi_az" {
  description = "Multi-AZ deployment (prod)."
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  description = "Automated backup retention window."
  type        = number
  default     = 7
}

variable "storage_kms_key_arn" {
  description = "Optional KMS key ARN for storage encryption (null = default aws/rds key)."
  type        = string
  default     = null
}

variable "apply_immediately" {
  description = "Apply modifications immediately (dev) vs in the maintenance window."
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Protect the instance from deletion (enable in prod)."
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip the final snapshot on destroy (true for dev)."
  type        = bool
  default     = true
}

variable "enable_proxy" {
  description = "Provision an RDS Proxy for connection pooling (prod). Off by default for dev cost."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}
