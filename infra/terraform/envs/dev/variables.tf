variable "project" {
  description = "Project slug used as a name prefix."
  type        = string
  default     = "reelify"
}

variable "env" {
  description = "Environment name."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for this environment."
  type        = string
  default     = "us-east-1"
}

variable "data_region" {
  description = "Logical data region for the primary data plane. Immutable per agency."
  type        = string
  default     = "us"
}

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of AZs to spread subnets across."
  type        = number
  default     = 2
}

variable "media_bucket_name" {
  description = "Globally-unique media bucket name for the us data plane (dev)."
  type        = string
  default     = "reelify-media-us-dev"
}

variable "cors_allowed_origins" {
  description = "Origins allowed to perform direct browser multipart uploads."
  type        = list(string)
  default     = ["http://localhost:3000", "https://reelify.cc"]
}
