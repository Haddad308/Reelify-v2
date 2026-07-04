variable "aws_region" {
  description = "AWS region for the remote-state backend."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project slug used to name shared resources."
  type        = string
  default     = "reelify"
}
