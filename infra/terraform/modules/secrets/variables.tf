variable "name" {
  description = "Name prefix for secrets (e.g. reelify-dev)."
  type        = string
}

variable "env" {
  description = "Environment name."
  type        = string
}

variable "data_region" {
  description = "Logical data region this KMS key/secret plane serves."
  type        = string
  default     = "us"
}

variable "secret_names" {
  description = "Logical secret names to create containers for (path segments under the prefix)."
  type        = list(string)
  default = [
    "provider/elevenlabs",
    "provider/gemini",
    "database/url",
  ]
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}
