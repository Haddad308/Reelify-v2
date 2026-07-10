variable "domain" {
  description = "Apex domain for the hosted zone (e.g. reelify.cc)."
  type        = string
}

variable "create_certificate" {
  description = "Create + DNS-validate an ACM cert (domain + wildcard). Enable only AFTER the registrar's nameservers point at this zone."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}
