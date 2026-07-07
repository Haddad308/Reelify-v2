variable "name" {
  description = "Name prefix (e.g. reelify)."
  type        = string
}

variable "domain_prefix" {
  description = "Globally-unique hosted-UI domain prefix (<prefix>.auth.<region>.amazoncognito.com)."
  type        = string
}

variable "callback_urls" {
  description = "Allowed OAuth callback URLs."
  type        = list(string)
  default     = []
}

variable "logout_urls" {
  description = "Allowed sign-out URLs."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}
