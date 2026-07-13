output "cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.this.name
}

output "task_security_group_id" {
  description = "Security group id shared by the ECS tasks."
  value       = aws_security_group.tasks.id
}

output "log_group_name" {
  description = "CloudWatch log group for all services."
  value       = aws_cloudwatch_log_group.this.name
}

output "service_names" {
  description = "ECS service names."
  value = compact([
    aws_ecs_service.api.name,
    aws_ecs_service.ffmpeg.name,
    aws_ecs_service.light.name,
    local.enable_web ? aws_ecs_service.web[0].name : "",
  ])
}
