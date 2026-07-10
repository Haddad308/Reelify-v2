###############################################################################
# registry module — ECR repositories (plan §"registry"). Pilot uses two images:
#   backend (api + ffmpeg + light worker, command overridden per ECS service)
#   web     (Next.js standalone)
###############################################################################

locals {
  common_tags = merge(var.tags, { component = "registry" })
}

resource "aws_ecr_repository" "this" {
  for_each = toset(var.repositories)

  name                 = "${var.name}/${each.value}"
  image_tag_mutability = "MUTABLE"
  force_delete         = var.force_delete

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(local.common_tags, { Name = "${var.name}/${each.value}" })
}

# Keep image sprawl bounded (pilot: last 10 images per repo).
resource "aws_ecr_lifecycle_policy" "this" {
  for_each = aws_ecr_repository.this

  repository = each.value.name
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${var.keep_last_images} images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.keep_last_images
        }
        action = { type = "expire" }
      }
    ]
  })
}
