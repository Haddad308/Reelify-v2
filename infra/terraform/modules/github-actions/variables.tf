variable "name" {
  description = "Resource name prefix (matches the ECS cluster / ECR namespace)."
  type        = string
}

variable "github_org" {
  description = "GitHub organization or user that owns the repository."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (without org)."
  type        = string
}

variable "allowed_branches" {
  description = "Git branches allowed to assume the deploy role."
  type        = list(string)
  default     = ["master"]
}

variable "ecr_repository_arns" {
  description = "ECR repository ARNs the role may push to."
  type        = list(string)
}

variable "aws_region" {
  description = "AWS region (for ECS service ARN scoping)."
  type        = string
}

variable "create_oidc_provider" {
  description = "Create the GitHub OIDC provider (set false if it already exists in the account)."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to IAM resources."
  type        = map(string)
  default     = {}
}
