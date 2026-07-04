variable "name" {
  description = "Name prefix for roles (e.g. reelify-dev)."
  type        = string
}

variable "media_bucket_arn" {
  description = "ARN of the media S3 bucket."
  type        = string
}

variable "media_kms_key_arn" {
  description = "ARN of the KMS key protecting media at rest."
  type        = string
}

variable "secrets_kms_key_arn" {
  description = "ARN of the KMS key protecting Secrets Manager secrets."
  type        = string
}

variable "secret_arns" {
  description = "Map of logical secret name -> ARN (from the secrets module)."
  type        = map(string)
  default     = {}
}

variable "queue_arns" {
  description = "Map of queue class -> ARN (from the queue module). Requires extraction/transcription/scoring keys."
  type        = map(string)
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}
