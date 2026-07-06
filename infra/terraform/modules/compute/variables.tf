variable "name" {
  description = "Name prefix / cluster name (e.g. reelify)."
  type        = string
}

variable "region" {
  description = "AWS region."
  type        = string
}

variable "vpc_id" {
  description = "VPC id (for the task security group)."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet ids the Fargate tasks run in (assign_public_ip)."
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "ALB security group id allowed to reach the app ports."
  type        = string
}

variable "backend_image" {
  description = "Backend image URI (api/ffmpeg/light via command override)."
  type        = string
}

variable "web_image" {
  description = "Web image URI. Empty = do not deploy the web service yet."
  type        = string
  default     = ""
}

variable "execution_role_arn" {
  description = "Shared ECS task execution role ARN."
  type        = string
}

variable "task_role_arns" {
  description = "Map of role name -> ARN (needs api, ffmpeg, light, web)."
  type        = map(string)
}

variable "api_target_group_arn" {
  description = "ALB target group ARN for the API."
  type        = string
}

variable "web_target_group_arn" {
  description = "ALB target group ARN for web."
  type        = string
}

variable "secret_arns" {
  description = "Map of logical secret -> ARN (database/url, provider/elevenlabs, provider/gemini)."
  type        = map(string)
}

variable "queue_urls" {
  description = "Map of queue class -> URL (extraction/transcription/scoring)."
  type        = map(string)
}

variable "media_bucket" {
  description = "Media bucket name (for the API)."
  type        = string
}

variable "default_data_region" {
  type    = string
  default = "us"
}

variable "pipeline_version" {
  type    = string
  default = "v1"
}

variable "auth_mode" {
  description = "API auth mode: dev or cognito."
  type        = string
  default     = "dev"
}

variable "gemini_model" {
  type    = string
  default = ""
}

variable "api_extra_env" {
  description = "Extra environment entries for the API container (e.g. Cognito settings)."
  type        = list(object({ name = string, value = string }))
  default     = []
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "api_cpu" {
  type    = number
  default = 512
}
variable "api_memory" {
  type    = number
  default = 1024
}
variable "ffmpeg_cpu" {
  type    = number
  default = 1024
}
variable "ffmpeg_memory" {
  type    = number
  default = 2048
}
variable "ffmpeg_ephemeral_gib" {
  type    = number
  default = 40
}
variable "light_cpu" {
  type    = number
  default = 512
}
variable "light_memory" {
  type    = number
  default = 1024
}
variable "web_cpu" {
  type    = number
  default = 512
}
variable "web_memory" {
  type    = number
  default = 1024
}
variable "api_port" {
  type    = number
  default = 8080
}
variable "web_port" {
  type    = number
  default = 3000
}

variable "tags" {
  type    = map(string)
  default = {}
}
