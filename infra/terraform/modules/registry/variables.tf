variable "name" {
  description = "Name prefix for repositories (e.g. reelify)."
  type        = string
}

variable "repositories" {
  description = "Repository short-names to create under the prefix."
  type        = list(string)
  default     = ["backend", "web"]
}

variable "keep_last_images" {
  description = "How many images to retain per repo (lifecycle)."
  type        = number
  default     = 10
}

variable "force_delete" {
  description = "Allow deleting repos that still contain images (pilot convenience)."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}
