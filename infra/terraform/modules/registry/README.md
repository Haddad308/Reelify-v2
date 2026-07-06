# Module: registry

ECR repositories with scan-on-push, AES256 encryption, and a lifecycle policy
(keep last N images). Pilot creates two: `reelify/backend` and `reelify/web`.

The **backend** image contains all Node packages + a pinned ffmpeg; the ECS task
definitions override the container command so one image serves the API, the
FFmpeg worker, and the co-located light worker (dispatcher + transcription +
scoring). The **web** image is the Next.js standalone build.

Outputs: `repository_urls`, `repository_arns` (maps keyed by short-name).
