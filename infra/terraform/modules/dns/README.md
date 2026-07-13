# Module: dns

Route53 hosted zone for the domain + a DNS-validated ACM certificate
(`domain` + `*.domain`).

**Two-phase (because ACM can't validate until the registrar delegates):**
1. `create_certificate = false` → apply. Read `nameservers` and set them as
   Dynadot custom nameservers (see `docs/DEPLOY_DOMAIN_DYNADOT.md`).
2. `create_certificate = true` → apply. ACM validation records are written to
   the zone and the cert validates (~2–5 min). `certificate_arn` is then
   consumable by the `edge` module for the HTTPS listener.

Outputs: `zone_id`, `nameservers`, `certificate_arn`.
