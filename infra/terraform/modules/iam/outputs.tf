output "execution_role_arn" {
  description = "Shared ECS task execution role ARN."
  value       = aws_iam_role.execution.arn
}

output "task_role_arns" {
  description = "Map of service -> task role ARN."
  value = {
    web           = aws_iam_role.web.arn
    api           = aws_iam_role.api.arn
    dispatcher    = aws_iam_role.dispatcher.arn
    ffmpeg        = aws_iam_role.ffmpeg.arn
    transcription = aws_iam_role.transcription.arn
    scoring       = aws_iam_role.scoring.arn
  }
}
