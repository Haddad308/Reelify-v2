###############################################################################
# queue module — SQS work queues, each with its own dead-letter queue and a
# redrive policy (plan §12). DLQs exist from day one. Managed SSE (free) is
# enabled on every queue.
###############################################################################

locals {
  common_tags = merge(var.tags, {
    component = "queue"
  })
}

resource "aws_sqs_queue" "dlq" {
  for_each = var.queues

  name                      = "${var.name}-${each.key}-dlq"
  message_retention_seconds = var.dlq_retention_seconds
  sqs_managed_sse_enabled   = true

  tags = merge(local.common_tags, {
    Name  = "${var.name}-${each.key}-dlq"
    class = each.key
    role  = "dlq"
  })
}

resource "aws_sqs_queue" "main" {
  for_each = var.queues

  name                       = "${var.name}-${each.key}"
  visibility_timeout_seconds = each.value.visibility_timeout_seconds
  message_retention_seconds  = try(each.value.message_retention_seconds, var.default_retention_seconds)
  receive_wait_time_seconds  = var.receive_wait_time_seconds # long polling
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = each.value.max_receive_count
  })

  tags = merge(local.common_tags, {
    Name  = "${var.name}-${each.key}"
    class = each.key
    role  = "work"
  })
}

# Let each DLQ know which queue(s) are allowed to redrive into it.
resource "aws_sqs_queue_redrive_allow_policy" "dlq" {
  for_each = var.queues

  queue_url = aws_sqs_queue.dlq[each.key].id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.main[each.key].arn]
  })
}
