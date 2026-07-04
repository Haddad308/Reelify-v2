###############################################################################
# storage module — private S3 media bucket for one data plane (e.g. "us").
# Block public access, versioning, SSE-KMS, lifecycle (multipart abort, audio
# expiry, tiering), and CORS for direct browser multipart uploads. Plan §11,§14.
###############################################################################

locals {
  common_tags = merge(var.tags, {
    component   = "storage"
    data_region = var.data_region
  })

  create_kms = var.kms_key_arn == null || var.kms_key_arn == ""
}

# Dedicated KMS key for media at rest (unless an existing key ARN is supplied).
resource "aws_kms_key" "media" {
  count = local.create_kms ? 1 : 0

  description             = "Reelify media encryption (${var.data_region}/${var.env})"
  deletion_window_in_days = 14
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${var.bucket_name}-kms"
  })
}

resource "aws_kms_alias" "media" {
  count = local.create_kms ? 1 : 0

  name          = "alias/${var.bucket_name}"
  target_key_id = aws_kms_key.media[0].key_id
}

locals {
  kms_key_arn = local.create_kms ? aws_kms_key.media[0].arn : var.kms_key_arn
}

resource "aws_s3_bucket" "media" {
  bucket        = var.bucket_name
  force_destroy = var.force_destroy

  tags = merge(local.common_tags, {
    Name = var.bucket_name
  })
}

resource "aws_s3_bucket_ownership_controls" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = local.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

# CORS for direct browser -> S3 multipart uploads (signed URLs).
# ETag must be exposed so the browser can complete a multipart upload.
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  # Reclaim storage from uploads that never completed.
  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = var.multipart_abort_days
    }
  }

  # Derived audio artifacts are cheap to regenerate; expire them.
  rule {
    id     = "expire-audio-artifacts"
    status = "Enabled"

    filter {
      prefix = "audio/"
    }

    expiration {
      days = var.audio_expiry_days
    }
  }

  # Tier long-lived source originals to cheaper storage after the hot window.
  rule {
    id     = "tier-originals"
    status = "Enabled"

    filter {
      prefix = "originals/"
    }

    transition {
      days          = var.originals_transition_days
      storage_class = var.originals_transition_class
    }
  }

  # Keep noncurrent versions bounded.
  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }
}

# Deny non-TLS access.
resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}
