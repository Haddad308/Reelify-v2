variable "bucket_name" {
  description = "Globally-unique S3 bucket name for this data plane (e.g. reelify-media-us-dev)."
  type        = string
}

variable "env" {
  description = "Environment name (dev/staging/prod)."
  type        = string
}

variable "data_region" {
  description = "Logical data region this bucket serves (e.g. us). Immutable per agency."
  type        = string
  default     = "us"
}

variable "kms_key_arn" {
  description = "Existing KMS key ARN for SSE-KMS. If null/empty, the module creates one."
  type        = string
  default     = null
}

variable "cors_allowed_origins" {
  description = "Origins allowed to perform direct browser multipart uploads."
  type        = list(string)
  default     = []
}

variable "force_destroy" {
  description = "Allow Terraform to delete a non-empty bucket (dev convenience; keep false in prod)."
  type        = bool
  default     = false
}

variable "multipart_abort_days" {
  description = "Abort incomplete multipart uploads after this many days."
  type        = number
  default     = 7
}

variable "audio_expiry_days" {
  description = "Expire derived audio artifacts under audio/ after this many days."
  type        = number
  default     = 30
}

variable "originals_transition_days" {
  description = "Days before source originals transition to cheaper storage (plan §14: 90d hot)."
  type        = number
  default     = 90
}

variable "originals_transition_class" {
  description = "Storage class to transition originals into."
  type        = string
  default     = "INTELLIGENT_TIERING"
}

variable "noncurrent_version_expiration_days" {
  description = "Delete noncurrent object versions after this many days."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}
