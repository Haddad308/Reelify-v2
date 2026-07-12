variable "name" {
  description = "Name prefix (e.g. reelify)."
  type        = string
}

variable "allow_self_sign_up" {
  description = "When true, users can register via Hosted UI / SignUp API. When false, only admins can create users."
  type        = bool
  default     = true
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
