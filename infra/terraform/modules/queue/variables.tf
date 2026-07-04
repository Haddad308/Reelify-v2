variable "name" {
  description = "Name prefix for queues (e.g. reelify-dev)."
  type        = string
}

variable "queues" {
  description = "Work queues to create; each gets a matching DLQ + redrive policy."
  type = map(object({
    visibility_timeout_seconds = number
    max_receive_count          = number
    message_retention_seconds  = optional(number)
  }))
  default = {
    extraction    = { visibility_timeout_seconds = 900, max_receive_count = 5 }
    transcription = { visibility_timeout_seconds = 600, max_receive_count = 5 }
    scoring       = { visibility_timeout_seconds = 300, max_receive_count = 5 }
  }
}

variable "default_retention_seconds" {
  description = "Default message retention for work queues (4 days)."
  type        = number
  default     = 345600
}

variable "dlq_retention_seconds" {
  description = "Message retention for DLQs (14 days) to allow investigation."
  type        = number
  default     = 1209600
}

variable "receive_wait_time_seconds" {
  description = "Long-polling wait time on work queues."
  type        = number
  default     = 20
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}
