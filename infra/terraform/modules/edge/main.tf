###############################################################################
# edge module — public Application Load Balancer for the pilot. Path-routed:
#   /v1/*  -> API target group
#   else   -> web target group
# HTTPS + Route53 alias records are enabled once a cert + hosted zone exist.
# (No CloudFront for the pilot; add when scaling.)
###############################################################################

locals {
  common_tags   = merge(var.tags, { component = "edge" })
  https_enabled = var.certificate_arn != ""
}

resource "aws_security_group" "alb" {
  name        = "${var.name}-alb-sg"
  description = "Public ALB ingress (80/443)"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${var.name}-alb-sg" })
}

resource "aws_lb" "this" {
  name               = "${var.name}-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
  idle_timeout       = 120 # allow slower API responses

  tags = merge(local.common_tags, { Name = "${var.name}-alb" })
}

resource "aws_lb_target_group" "api" {
  name        = "${var.name}-api-tg"
  port        = var.api_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = var.api_health_path
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
  }

  tags = merge(local.common_tags, { Name = "${var.name}-api-tg" })
}

resource "aws_lb_target_group" "web" {
  name        = "${var.name}-web-tg"
  port        = var.web_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = var.web_health_path
    matcher             = "200-399" # Next.js locale redirects
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
  }

  tags = merge(local.common_tags, { Name = "${var.name}-web-tg" })
}

# HTTP listener: redirect to HTTPS when a cert exists, else serve directly.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = local.https_enabled ? "redirect" : "forward"
    target_group_arn = local.https_enabled ? null : aws_lb_target_group.web.arn

    dynamic "redirect" {
      for_each = local.https_enabled ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
}

resource "aws_lb_listener_rule" "http_api" {
  count = local.https_enabled ? 0 : 1

  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
  condition {
    path_pattern {
      values = ["/v1/*", "/v1"]
    }
  }
}

# HTTPS listener (only when a cert is supplied).
resource "aws_lb_listener" "https" {
  count = local.https_enabled ? 1 : 0

  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

resource "aws_lb_listener_rule" "https_api" {
  count = local.https_enabled ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
  condition {
    path_pattern {
      values = ["/v1/*", "/v1"]
    }
  }
}

# Route53 alias records (apex/www/api -> ALB) once the zone exists.
resource "aws_route53_record" "alias" {
  for_each = var.hosted_zone_id == "" ? toset([]) : toset(var.domain_names)

  zone_id = var.hosted_zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_lb.this.dns_name
    zone_id                = aws_lb.this.zone_id
    evaluate_target_health = true
  }
}
