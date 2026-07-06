# Making `reelify.cc` live on AWS (domain at Dynadot)

This is the step-by-step for pointing your Dynadot-registered `reelify.cc` at the
new AWS stack (CloudFront for the web app, ALB for the API), including HTTPS.

There are two approaches. **Approach A (recommended)** makes your only Dynadot
action a one-time nameserver change and lets Terraform manage everything else
(records + auto-validated HTTPS). **Approach B** keeps DNS at Dynadot and you add
records by hand.

---

## What points where (target)

| Hostname | Points to | Purpose |
| --- | --- | --- |
| `reelify.cc` (apex) | CloudFront distribution | Web app |
| `www.reelify.cc` | CloudFront distribution | Web app (redirect/alias) |
| `api.reelify.cc` | Application Load Balancer | Control-plane API |

HTTPS uses **AWS Certificate Manager (ACM)** certs, which are validated by adding
a special CNAME record — automatic under Approach A.

---

## Approach A — Delegate DNS to Route53 (recommended)

Your only Dynadot step is changing the nameservers. After that, Reelify's
Terraform manages the hosted zone, records, and TLS certificate automatically —
including the apex (`reelify.cc`), which a plain CNAME cannot do at Dynadot.

### Step 1 — (AWS side, done by Reelify/Terraform)
A Route53 **hosted zone** for `reelify.cc` is created. It outputs **4 nameservers**
that look like:

```
ns-123.awsdns-45.com
ns-678.awsdns-90.net
ns-1011.awsdns-12.org
ns-1314.awsdns-15.co.uk
```

> You'll get the exact 4 values from the Terraform output `route53_nameservers`
> (or the Route53 console → Hosted zones → reelify.cc → "Hosted zone details").

### Step 2 — (Dynadot) set custom nameservers
1. Log in to Dynadot → **My Domains** → **Manage** (or click `reelify.cc`).
2. Open the **Nameservers** section (sometimes under "DNS Settings" →
   "Nameserver Settings").
3. Choose **Custom Nameservers** (not "Dynadot DNS" / "Dynadot Nameservers").
4. Enter the **4 Route53 nameservers** from Step 1 (one per field). Remove any
   trailing dot; do not add `http://`.
5. **Save**.

That's the entire Dynadot change. Propagation is usually minutes but can take up
to a few hours (registrar TTL).

### Step 3 — (AWS side, done by Reelify/Terraform)
Once the zone is authoritative, Terraform:
- Requests an ACM cert for `reelify.cc` + `*.reelify.cc` and creates the DNS
  validation records in Route53 (auto-validates in ~2–5 min).
- Creates the CloudFront distribution (web) + ALB (api).
- Creates Route53 **alias** records: apex + `www` → CloudFront, `api` → ALB.

### Step 4 — Verify
```bash
dig +short NS reelify.cc            # should show the 4 awsdns nameservers
dig +short reelify.cc               # resolves to CloudFront
curl -I https://api.reelify.cc/v1/healthz   # 200 over HTTPS
```
Open `https://reelify.cc` in a browser — the web app should load over HTTPS.

---

## Approach B — Keep DNS at Dynadot (manual records)

Use this only if you don't want to move nameservers. Caveat: the **apex
`reelify.cc` cannot be a CNAME**, so you must either use Dynadot's domain
**forwarding** (apex → `https://www.reelify.cc`) or a Dynadot ALIAS record if
available on your plan.

In Dynadot → `reelify.cc` → **DNS Settings** → set record type to **"Dynadot DNS"**
and add:

| Type | Host / Subdomain | Value (points to) | Notes |
| --- | --- | --- | --- |
| CNAME | `_<acm-name>` | `<acm-validation-value>` | ACM validation (one per cert SAN) |
| CNAME | `www` | `<cloudfront-domain>` (e.g. `d123.cloudfront.net`) | web |
| CNAME | `api` | `<alb-dns-name>` (e.g. `reelify-alb-...elb.amazonaws.com`) | API |
| — | apex `reelify.cc` | Dynadot **Forwarding** → `https://www.reelify.cc` | apex can't CNAME |

> Where these values come from:
> - `<acm-name>` / `<acm-validation-value>`: ACM console → your cert → "Create
>   records in Route 53" is disabled here; instead copy the CNAME name+value shown.
> - `<cloudfront-domain>`: CloudFront console → your distribution → "Distribution
>   domain name", or Terraform output `cloudfront_domain_name`.
> - `<alb-dns-name>`: EC2 → Load balancers → your ALB → "DNS name", or Terraform
>   output `alb_dns_name`.

ACM certs won't issue until the validation CNAME(s) resolve, so add those first.

---

## Which should you pick?
- **Approach A** — recommended. Cleaner apex handling, auto-renewing TLS, all DNS
  in one place (Terraform/Route53), one Dynadot action.
- **Approach B** — no nameserver change, but manual record upkeep and an awkward
  apex redirect.

## Can Reelify do the Dynadot step for you?
Yes — with your explicit go-ahead. Since you're logged into the Dynadot dashboard,
the automation can set the 4 custom nameservers (Approach A) via the browser once
the Route53 zone exists and its nameservers are known. It's a low-risk, reversible
change; every step will be screenshotted and confirmed. If the dashboard hits 2FA
or an unexpected screen, it will stop and hand you the exact 4 values to paste.

## Rollback
- Approach A: in Dynadot, switch nameservers back to **Dynadot DNS** (or the
  previous values). DNS reverts after TTL.
- Approach B: delete the added records.

## Also update after go-live
- **Cognito** callback/sign-out URLs → `https://reelify.cc/...`.
- **Google (YouTube) & Facebook OAuth** redirect URIs → `https://reelify.cc/api/auth/...`.
- `NEXT_PUBLIC_BASE_URL` → `https://reelify.cc`.
