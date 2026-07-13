###############################################################################
# iam module — separate least-privilege roles (plan §11):
#   - one shared ECS task EXECUTION role (image pull, logs, secret injection)
#   - one TASK role per service: web, api, outbox-dispatcher, ffmpeg,
#     transcription, scoring. Each gets only the S3/SQS/Secrets/KMS it needs.
###############################################################################

locals {
  common_tags = merge(var.tags, { component = "iam" })

  all_secret_arns = values(var.secret_arns)
  db_secret_arn   = lookup(var.secret_arns, "database/url", null)
  el_secret_arn   = lookup(var.secret_arns, "provider/elevenlabs", null)
  gm_secret_arn   = lookup(var.secret_arns, "provider/gemini", null)
}

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# ---------------------------------------------------------------------------
# Shared execution role — pulls images, writes logs, injects secrets at launch.
# ---------------------------------------------------------------------------
resource "aws_iam_role" "execution" {
  name               = "${var.name}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = merge(local.common_tags, { role = "execution" })
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    sid       = "ReadInjectedSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = local.all_secret_arns
  }
  statement {
    sid       = "DecryptSecrets"
    actions   = ["kms:Decrypt"]
    resources = [var.secrets_kms_key_arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "${var.name}-execution-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# ---------------------------------------------------------------------------
# Reusable statement fragments
# ---------------------------------------------------------------------------
locals {
  s3_object_arn = "${var.media_bucket_arn}/*"
}

# ---- web task role (serves Next.js; no direct AWS data access needed) -------
resource "aws_iam_role" "web" {
  name               = "${var.name}-task-web"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = merge(local.common_tags, { role = "web" })
}

# ---- api task role: S3 multipart/presign + media KMS + db secret ------------
data "aws_iam_policy_document" "api" {
  statement {
    sid = "MediaObjectRW"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:AbortMultipartUpload",
      "s3:ListMultipartUploadParts",
    ]
    resources = [local.s3_object_arn]
  }
  statement {
    sid       = "MediaBucketList"
    actions   = ["s3:ListBucket", "s3:ListBucketMultipartUploads", "s3:GetBucketLocation"]
    resources = [var.media_bucket_arn]
  }
  statement {
    sid       = "MediaKms"
    actions   = ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"]
    resources = [var.media_kms_key_arn]
  }
  dynamic "statement" {
    for_each = local.db_secret_arn == null ? [] : [local.db_secret_arn]
    content {
      sid       = "DbSecret"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = [statement.value]
    }
  }
  statement {
    sid       = "DecryptSecrets"
    actions   = ["kms:Decrypt"]
    resources = [var.secrets_kms_key_arn]
  }
}

resource "aws_iam_role" "api" {
  name               = "${var.name}-task-api"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = merge(local.common_tags, { role = "api" })
}

resource "aws_iam_role_policy" "api" {
  name   = "${var.name}-api"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api.json
}

# ---- outbox-dispatcher: SendMessage to all work queues + db secret ----------
data "aws_iam_policy_document" "dispatcher" {
  statement {
    sid       = "SendToWorkQueues"
    actions   = ["sqs:SendMessage", "sqs:GetQueueUrl", "sqs:GetQueueAttributes"]
    resources = values(var.queue_arns)
  }
  dynamic "statement" {
    for_each = local.db_secret_arn == null ? [] : [local.db_secret_arn]
    content {
      sid       = "DbSecret"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = [statement.value]
    }
  }
  statement {
    sid       = "DecryptSecrets"
    actions   = ["kms:Decrypt"]
    resources = [var.secrets_kms_key_arn]
  }
}

resource "aws_iam_role" "dispatcher" {
  name               = "${var.name}-task-dispatcher"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = merge(local.common_tags, { role = "dispatcher" })
}

resource "aws_iam_role_policy" "dispatcher" {
  name   = "${var.name}-dispatcher"
  role   = aws_iam_role.dispatcher.id
  policy = data.aws_iam_policy_document.dispatcher.json
}

# ---- ffmpeg worker: consume extraction queue; read source, write audio ------
data "aws_iam_policy_document" "ffmpeg" {
  statement {
    sid       = "ConsumeExtraction"
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ChangeMessageVisibility"]
    resources = [var.queue_arns["extraction"]]
  }
  statement {
    sid       = "MediaObjectRW"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = [local.s3_object_arn]
  }
  statement {
    sid       = "MediaKms"
    actions   = ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"]
    resources = [var.media_kms_key_arn]
  }
  dynamic "statement" {
    for_each = local.db_secret_arn == null ? [] : [local.db_secret_arn]
    content {
      sid       = "DbSecret"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = [statement.value]
    }
  }
  statement {
    sid       = "DecryptSecrets"
    actions   = ["kms:Decrypt"]
    resources = [var.secrets_kms_key_arn]
  }
}

resource "aws_iam_role" "ffmpeg" {
  name               = "${var.name}-task-ffmpeg"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = merge(local.common_tags, { role = "ffmpeg" })
}

resource "aws_iam_role_policy" "ffmpeg" {
  name   = "${var.name}-ffmpeg"
  role   = aws_iam_role.ffmpeg.id
  policy = data.aws_iam_policy_document.ffmpeg.json
}

# ---- transcription worker: consume transcription queue; read audio; EL key --
data "aws_iam_policy_document" "transcription" {
  statement {
    sid       = "ConsumeTranscription"
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ChangeMessageVisibility"]
    resources = [var.queue_arns["transcription"]]
  }
  statement {
    sid       = "ReadAudio"
    actions   = ["s3:GetObject"]
    resources = [local.s3_object_arn]
  }
  statement {
    sid       = "MediaKms"
    actions   = ["kms:Decrypt"]
    resources = [var.media_kms_key_arn]
  }
  statement {
    sid       = "ProviderAndDbSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = compact([local.el_secret_arn, local.db_secret_arn])
  }
  statement {
    sid       = "DecryptSecrets"
    actions   = ["kms:Decrypt"]
    resources = [var.secrets_kms_key_arn]
  }
}

resource "aws_iam_role" "transcription" {
  name               = "${var.name}-task-transcription"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = merge(local.common_tags, { role = "transcription" })
}

resource "aws_iam_role_policy" "transcription" {
  name   = "${var.name}-transcription"
  role   = aws_iam_role.transcription.id
  policy = data.aws_iam_policy_document.transcription.json
}

# ---- light worker (pilot): dispatcher + transcription + scoring co-located ----
data "aws_iam_policy_document" "light" {
  statement {
    sid       = "SendToWorkQueues"
    actions   = ["sqs:SendMessage", "sqs:GetQueueUrl", "sqs:GetQueueAttributes"]
    resources = values(var.queue_arns)
  }
  statement {
    sid       = "ConsumeTranscriptionAndScoring"
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ChangeMessageVisibility"]
    resources = [var.queue_arns["transcription"], var.queue_arns["scoring"]]
  }
  statement {
    sid       = "ReadAudio"
    actions   = ["s3:GetObject"]
    resources = [local.s3_object_arn]
  }
  statement {
    sid       = "MediaKms"
    actions   = ["kms:Decrypt"]
    resources = [var.media_kms_key_arn]
  }
  statement {
    sid       = "ProviderAndDbSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = compact([local.el_secret_arn, local.gm_secret_arn, local.db_secret_arn])
  }
  statement {
    sid       = "DecryptSecrets"
    actions   = ["kms:Decrypt"]
    resources = [var.secrets_kms_key_arn]
  }
}

resource "aws_iam_role" "light" {
  name               = "${var.name}-task-light"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = merge(local.common_tags, { role = "light" })
}

resource "aws_iam_role_policy" "light" {
  name   = "${var.name}-light"
  role   = aws_iam_role.light.id
  policy = data.aws_iam_policy_document.light.json
}

# ---- scoring worker: consume scoring queue; Gemini key; db --------------------
data "aws_iam_policy_document" "scoring" {
  statement {
    sid       = "ConsumeScoring"
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ChangeMessageVisibility"]
    resources = [var.queue_arns["scoring"]]
  }
  statement {
    sid       = "ProviderAndDbSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = compact([local.gm_secret_arn, local.db_secret_arn])
  }
  statement {
    sid       = "DecryptSecrets"
    actions   = ["kms:Decrypt"]
    resources = [var.secrets_kms_key_arn]
  }
}

resource "aws_iam_role" "scoring" {
  name               = "${var.name}-task-scoring"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = merge(local.common_tags, { role = "scoring" })
}

resource "aws_iam_role_policy" "scoring" {
  name   = "${var.name}-scoring"
  role   = aws_iam_role.scoring.id
  policy = data.aws_iam_policy_document.scoring.json
}
