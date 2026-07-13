###############################################################################
# dns module — Route53 hosted zone + (gated) ACM certificate.
#
# Two-phase by design: apply the zone first, point Dynadot's nameservers at the
# zone's `nameservers`, THEN apply again with create_certificate=true so ACM can
# DNS-validate (it can't validate until the zone is authoritative).
###############################################################################

locals {
  common_tags = merge(var.tags, { component = "dns" })
}

resource "aws_route53_zone" "this" {
  name = var.domain
  tags = merge(local.common_tags, { Name = var.domain })
}

resource "aws_acm_certificate" "this" {
  count                     = var.create_certificate ? 1 : 0
  domain_name               = var.domain
  subject_alternative_names = ["*.${var.domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
  tags = local.common_tags
}

locals {
  validation = var.create_certificate ? {
    for o in aws_acm_certificate.this[0].domain_validation_options :
    o.domain_name => { name = o.resource_record_name, type = o.resource_record_type, value = o.resource_record_value }
  } : {}
}

resource "aws_route53_record" "cert_validation" {
  for_each = local.validation

  zone_id         = aws_route53_zone.this.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.value]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "this" {
  count                   = var.create_certificate ? 1 : 0
  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}
