# Module: compute

ECS Fargate cluster + services for the pilot-lean topology:

| Service | Image (command) | LB | Notes |
| --- | --- | --- | --- |
| `api` | backend (`@reelify/api start`) | API target group | port 8080 |
| `ffmpeg` | backend (`@reelify/ffmpeg-worker start`) | — | 40 GiB ephemeral disk, isolated |
| `light` | backend (dispatcher + transcription + scoring via `sh -c ... & wait -n`) | — | one task runs all three light loops |
| `web` | web image | web target group | port 3000; only if `web_image` set |

Tasks run in **public subnets with public IPs** (no NAT) and one shared security
group (ALB ingress on the app ports; open egress for S3/SQS/ECR/Secrets/providers).
Secrets (`DATABASE_URL`, `ELEVENLABS_API_KEYS`, `GEMINI_API_KEY`) are injected
from Secrets Manager via the execution role; per-service task roles scope runtime
permissions. `desired_count = 1` each (no autoscaling — pilot).
