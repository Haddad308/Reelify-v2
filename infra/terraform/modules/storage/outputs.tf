output "bucket_id" {
  description = "Media bucket name."
  value       = aws_s3_bucket.media.id
}

output "bucket_arn" {
  description = "Media bucket ARN."
  value       = aws_s3_bucket.media.arn
}

output "bucket_regional_domain_name" {
  description = "Regional domain name (useful for CloudFront / signed URLs)."
  value       = aws_s3_bucket.media.bucket_regional_domain_name
}

output "kms_key_arn" {
  description = "KMS key ARN protecting media at rest."
  value       = local.kms_key_arn
}
