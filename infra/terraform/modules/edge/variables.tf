variable "name" {
  description = "Name prefix (e.g. reelify)."
  type        = string
}

variable "vpc_id" {
  description = "VPC id."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet ids for the ALB (>=2 AZs)."
  type        = list(string)
}

variable "api_port" {
  description = "Container port for the API service."
  type        = number
  default     = 8080
}

variable "web_port" {
  description = "Container port for the web service."
  type        = number
  default     = 3000
}

variable "api_health_path" {
  description = "API health check path."
  type        = string
  default     = "/v1/healthz"
}

variable "web_health_path" {
  description = "Web health check path."
  type        = string
  default     = "/"
}

variable "certificate_arn" {
  description = "ACM cert ARN for HTTPS. Empty = HTTP only (pre-domain testing)."
  type        = string
  default     = ""
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone id for alias records. Empty = no DNS records."
  type        = string
  default     = ""
}

variable "domain_names" {
  description = "Hostnames to alias to the ALB (e.g. reelify.cc, www.reelify.cc, api.reelify.cc)."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}
