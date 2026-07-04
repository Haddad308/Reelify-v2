###############################################################################
# database module — RDS PostgreSQL (plan §3, §8). Multi-AZ toggle for prod, an
# RDS-managed master password (kept in Secrets Manager, never in state), and an
# optional RDS Proxy for connection pooling.
###############################################################################

locals {
  common_tags = merge(var.tags, { component = "database" })
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db"
  subnet_ids = var.subnet_ids
  tags       = merge(local.common_tags, { Name = "${var.name}-db-subnets" })
}

resource "aws_security_group" "rds" {
  name        = "${var.name}-rds-sg"
  description = "Postgres access from within the VPC"
  vpc_id      = var.vpc_id

  ingress {
    description = "Postgres from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${var.name}-rds-sg" })
}

resource "aws_db_instance" "this" {
  identifier     = "${var.name}-pg"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.storage_kms_key_arn

  db_name  = var.db_name
  username = var.master_username
  # RDS manages the master password in Secrets Manager (nothing in TF state).
  manage_master_user_password = true

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period    = var.backup_retention_days
  auto_minor_version_upgrade = true
  apply_immediately          = var.apply_immediately
  deletion_protection        = var.deletion_protection
  skip_final_snapshot        = var.skip_final_snapshot
  final_snapshot_identifier  = var.skip_final_snapshot ? null : "${var.name}-pg-final"

  tags = merge(local.common_tags, { Name = "${var.name}-pg" })
}

# ---------------------------------------------------------------------------
# Optional RDS Proxy (connection pooling). Off by default for dev cost.
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "proxy_assume" {
  count = var.enable_proxy ? 1 : 0
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["rds.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "proxy_secret" {
  count = var.enable_proxy ? 1 : 0
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_db_instance.this.master_user_secret[0].secret_arn]
  }
  statement {
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["secretsmanager.${var.aws_region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "proxy" {
  count              = var.enable_proxy ? 1 : 0
  name               = "${var.name}-rds-proxy"
  assume_role_policy = data.aws_iam_policy_document.proxy_assume[0].json
  tags               = local.common_tags
}

resource "aws_iam_role_policy" "proxy" {
  count  = var.enable_proxy ? 1 : 0
  name   = "${var.name}-rds-proxy-secret"
  role   = aws_iam_role.proxy[0].id
  policy = data.aws_iam_policy_document.proxy_secret[0].json
}

resource "aws_db_proxy" "this" {
  count                  = var.enable_proxy ? 1 : 0
  name                   = "${var.name}-proxy"
  engine_family          = "POSTGRESQL"
  role_arn               = aws_iam_role.proxy[0].arn
  vpc_subnet_ids         = var.subnet_ids
  vpc_security_group_ids = [aws_security_group.rds.id]
  require_tls            = true

  auth {
    auth_scheme = "SECRETS"
    secret_arn  = aws_db_instance.this.master_user_secret[0].secret_arn
    iam_auth    = "DISABLED"
  }

  tags = local.common_tags
}

resource "aws_db_proxy_default_target_group" "this" {
  count         = var.enable_proxy ? 1 : 0
  db_proxy_name = aws_db_proxy.this[0].name

  connection_pool_config {
    max_connections_percent      = 75
    max_idle_connections_percent = 50
  }
}

resource "aws_db_proxy_target" "this" {
  count                  = var.enable_proxy ? 1 : 0
  db_proxy_name          = aws_db_proxy.this[0].name
  target_group_name      = aws_db_proxy_default_target_group.this[0].name
  db_instance_identifier = aws_db_instance.this.identifier
}
