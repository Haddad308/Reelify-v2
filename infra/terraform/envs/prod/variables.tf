variable "project" {
  description = "Project slug / resource name prefix (no env suffix for the single prod stack)."
  type        = string
  default     = "reelify"
}

variable "env" {
  description = "Environment tag value."
  type        = string
  default     = "prod"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "data_region" {
  type    = string
  default = "us"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "media_bucket_name" {
  description = "Globally-unique media bucket name."
  type        = string
  default     = "reelify-media-us"
}

variable "cors_allowed_origins" {
  type    = list(string)
  default = ["https://reelify.cc", "https://www.reelify.cc", "http://localhost:3000"]
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "domain" {
  type    = string
  default = "reelify.cc"
}

variable "domain_names" {
  description = "Hostnames aliased to the ALB (once enable_dns_records = true)."
  type        = list(string)
  default     = ["reelify.cc", "www.reelify.cc", "api.reelify.cc"]
}

variable "create_certificate" {
  description = "Phase 4: create + validate the ACM cert (only after Dynadot nameservers point at the zone)."
  type        = bool
  default     = false
}

variable "enable_dns_records" {
  description = "Phase 4: create Route53 alias records (apex/www/api -> ALB)."
  type        = bool
  default     = false
}

variable "backend_image" {
  description = "Phase 2: backend image URI in ECR (e.g. <acct>.dkr.ecr.us-east-1.amazonaws.com/reelify/backend:latest). Empty = skip ECS."
  type        = string
  default     = ""
}

variable "web_image" {
  description = "Web image URI in ECR. Empty = skip the web service."
  type        = string
  default     = ""
}

variable "auth_mode" {
  description = "API auth mode: dev (header) or cognito."
  type        = string
  default     = "dev"
}

variable "gemini_model" {
  type    = string
  default = "gemini-2.5-pro"
}

# ---- Cognito ----------------------------------------------------------------
variable "enable_cognito" {
  description = "Create the Cognito user pool + app client + hosted UI domain."
  type        = bool
  default     = false
}

variable "cognito_domain_prefix" {
  description = "Globally-unique prefix for the Cognito hosted-UI domain (<prefix>.auth.<region>.amazoncognito.com)."
  type        = string
  default     = "reelify-auth"
}

variable "cognito_callback_urls" {
  description = "Allowed OAuth callback URLs for the hosted UI."
  type        = list(string)
  default     = ["https://reelify.cc/en/app", "https://www.reelify.cc/en/app", "http://localhost:3000/en/app"]
}

variable "cognito_logout_urls" {
  description = "Allowed sign-out URLs for the hosted UI."
  type        = list(string)
  default     = ["https://reelify.cc", "https://www.reelify.cc", "http://localhost:3000"]
}

# ---- Ops --------------------------------------------------------------------
variable "budget_limit_usd" {
  description = "Monthly cost budget in USD."
  type        = number
  default     = 60
}

variable "budget_alert_email" {
  description = "Email for budget threshold alerts (80/100/120%). Empty = budget tracked but no email."
  type        = string
  default     = ""
}
