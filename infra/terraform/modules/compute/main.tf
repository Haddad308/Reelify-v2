###############################################################################
# compute module — ECS Fargate cluster + services (plan §"compute", pilot-lean).
# One backend image serves three roles via command override (api, ffmpeg, light
# = dispatcher+transcription+scoring co-located). Web is a separate image.
# Tasks run in PUBLIC subnets with public IPs (no NAT) for the cost-lean pilot.
###############################################################################

locals {
  common_tags = merge(var.tags, { component = "compute" })

  base_env = [
    { name = "AWS_REGION", value = var.region },
    { name = "PIPELINE_VERSION", value = var.pipeline_version },
    { name = "DEFAULT_DATA_REGION", value = var.default_data_region },
  ]

  db_secret = [{ name = "DATABASE_URL", valueFrom = var.secret_arns["database/url"] }]

  enable_web = var.web_image != ""
}

resource "aws_ecs_cluster" "this" {
  name = var.name
  setting {
    name  = "containerInsights"
    value = "disabled" # pilot: keep costs down
  }
  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.name}"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

# One SG for all tasks: ALB may reach the api/web ports; egress open (workers
# need ElevenLabs/Gemini/S3/SQS/ECR/Secrets over the internet from public subnets).
resource "aws_security_group" "tasks" {
  name        = "${var.name}-tasks-sg"
  description = "ECS task SG (ALB ingress on app ports; open egress)"
  vpc_id      = var.vpc_id

  ingress {
    description     = "ALB to API"
    from_port       = var.api_port
    to_port         = var.api_port
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }
  ingress {
    description     = "ALB to web"
    from_port       = var.web_port
    to_port         = var.web_port
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${var.name}-tasks-sg" })
}

# Helper to render a single-container task definition.
locals {
  log_opts = {
    "awslogs-group"         = aws_cloudwatch_log_group.this.name
    "awslogs-region"        = var.region
    "awslogs-stream-prefix" = "ecs"
  }
}

# ---- API ---------------------------------------------------------------------
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arns["api"]

  container_definitions = jsonencode([{
    name         = "api"
    image        = var.backend_image
    essential    = true
    command      = ["npm", "run", "-w", "@reelify/api", "start"]
    portMappings = [{ containerPort = var.api_port, protocol = "tcp" }]
    environment = concat(local.base_env, [
      { name = "PORT", value = tostring(var.api_port) },
      { name = "MEDIA_BUCKET_US", value = var.media_bucket },
      { name = "AUTH_MODE", value = var.auth_mode },
    ], var.api_extra_env)
    secrets          = local.db_secret
    logConfiguration = { logDriver = "awslogs", options = local.log_opts }
  }])

  tags = local.common_tags
}

resource "aws_ecs_service" "api" {
  name            = "${var.name}-api"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = true
  }
  load_balancer {
    target_group_arn = var.api_target_group_arn
    container_name   = "api"
    container_port   = var.api_port
  }

  tags = local.common_tags
}

# ---- FFmpeg worker (isolated, larger disk) -----------------------------------
resource "aws_ecs_task_definition" "ffmpeg" {
  family                   = "${var.name}-ffmpeg"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ffmpeg_cpu
  memory                   = var.ffmpeg_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arns["ffmpeg"]

  ephemeral_storage {
    size_in_gib = var.ffmpeg_ephemeral_gib
  }

  container_definitions = jsonencode([{
    name      = "ffmpeg"
    image     = var.backend_image
    essential = true
    command   = ["npm", "run", "-w", "@reelify/ffmpeg-worker", "start"]
    environment = concat(local.base_env, [
      { name = "WORK_DIR", value = "/work" },
      { name = "SQS_EXTRACTION_QUEUE_URL", value = var.queue_urls["extraction"] },
    ])
    secrets          = local.db_secret
    logConfiguration = { logDriver = "awslogs", options = local.log_opts }
  }])

  tags = local.common_tags
}

resource "aws_ecs_service" "ffmpeg" {
  name            = "${var.name}-ffmpeg"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.ffmpeg.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = true
  }

  tags = local.common_tags
}

# ---- Light worker: dispatcher + transcription + scoring co-located -----------
resource "aws_ecs_task_definition" "light" {
  family                   = "${var.name}-light"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.light_cpu
  memory                   = var.light_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arns["light"]

  container_definitions = jsonencode([{
    name      = "light"
    image     = var.backend_image
    essential = true
    command = ["sh", "-c",
      "npm run -w @reelify/outbox-dispatcher start & npm run -w @reelify/transcription-worker start & npm run -w @reelify/scoring-worker start & wait"
    ]
    environment = concat(local.base_env, [
      { name = "SQS_EXTRACTION_QUEUE_URL", value = var.queue_urls["extraction"] },
      { name = "SQS_TRANSCRIPTION_QUEUE_URL", value = var.queue_urls["transcription"] },
      { name = "SQS_SCORING_QUEUE_URL", value = var.queue_urls["scoring"] },
      { name = "GEMINI_MODEL", value = var.gemini_model },
    ])
    secrets = concat(local.db_secret, [
      { name = "ELEVENLABS_API_KEYS", valueFrom = var.secret_arns["provider/elevenlabs"] },
      { name = "GEMINI_API_KEY", valueFrom = var.secret_arns["provider/gemini"] },
    ])
    logConfiguration = { logDriver = "awslogs", options = local.log_opts }
  }])

  tags = local.common_tags
}

resource "aws_ecs_service" "light" {
  name            = "${var.name}-light"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.light.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = true
  }

  tags = local.common_tags
}

# ---- Web (optional until an image exists) ------------------------------------
resource "aws_ecs_task_definition" "web" {
  count                    = local.enable_web ? 1 : 0
  family                   = "${var.name}-web"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.web_cpu
  memory                   = var.web_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arns["web"]

  container_definitions = jsonencode([{
    name         = "web"
    image        = var.web_image
    essential    = true
    portMappings = [{ containerPort = var.web_port, protocol = "tcp" }]
    environment = [
      { name = "PORT", value = tostring(var.web_port) },
      { name = "HOSTNAME", value = "0.0.0.0" },
      { name = "NODE_ENV", value = "production" },
    ]
    logConfiguration = { logDriver = "awslogs", options = local.log_opts }
  }])

  tags = local.common_tags
}

resource "aws_ecs_service" "web" {
  count           = local.enable_web ? 1 : 0
  name            = "${var.name}-web"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.web[0].arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = true
  }
  load_balancer {
    target_group_arn = var.web_target_group_arn
    container_name   = "web"
    container_port   = var.web_port
  }

  tags = local.common_tags
}
