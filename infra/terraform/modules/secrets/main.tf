###############################################################################
# secrets module — a regional KMS key + Secrets Manager containers (plan §11).
#
# Terraform manages the KMS key and the secret CONTAINERS. Secret VALUES are NOT
# stored in Terraform state by default (avoids leaking secrets into state); set
# them out-of-band with `aws secretsmanager put-secret-value`. For local/dev
# convenience an optional `secret_values` map can seed initial versions.
###############################################################################

locals {
  common_tags = merge(var.tags, {
    component   = "secrets"
    data_region = var.data_region
  })
}

resource "aws_kms_key" "secrets" {
  description             = "Reelify secrets encryption (${var.data_region}/${var.env})"
  deletion_window_in_days = 14
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${var.name}-secrets-kms"
  })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.name}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

resource "aws_secretsmanager_secret" "this" {
  for_each = toset(var.secret_names)

  name        = "${var.name}/${each.value}"
  description = "Reelify ${each.value} (${var.env})"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = merge(local.common_tags, {
    Name = "${var.name}/${each.value}"
  })
}

# NOTE: secret VALUES are deliberately not managed here (keeps secrets out of
# Terraform state). Populate them out-of-band, e.g.:
#   aws secretsmanager put-secret-value --secret-id <name> --secret-string <value>
