# Module: edge

Public Application Load Balancer for the pilot (no CloudFront yet).

- **Path routing**: `/v1/*` → API target group; everything else → web target
  group. So the web app and API share one origin (relative `/v1/...` calls work).
- **HTTP → HTTPS**: when `certificate_arn` is set, the :80 listener 301-redirects
  to :443 (ACM cert). Before a domain/cert exists, it serves over :80 so you can
  test against the raw ALB DNS name.
- **DNS**: when `hosted_zone_id` is set, creates A-alias records for
  `domain_names` (apex/www/api) → ALB.

Outputs feed the `compute` module (target group ARNs, ALB SG id) and the `dns`
setup (alb dns/zone).

> Deliberately omits CloudFront + WAF for the 1-agency pilot; add them when
> scaling. TLS terminates at the ALB.
