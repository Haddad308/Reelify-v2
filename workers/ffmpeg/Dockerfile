# FFmpeg extraction worker (plan §9). Debian-slim base with a pinned ffmpeg,
# non-root user, and a writable /work mount for bounded ephemeral disk.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install workspace deps (uses the root lockfile; context is the repo root).
COPY package.json package-lock.json ./
COPY packages ./packages
COPY db ./db
COPY services ./services
COPY workers ./workers
RUN npm ci

# Generate the Prisma client for @reelify/db.
RUN npx prisma generate --schema db/schema.prisma

# Non-root user + writable work dir; keep the rest of the FS read-only at runtime.
RUN useradd --system --uid 10001 appuser \
  && mkdir -p /work \
  && chown -R appuser:appuser /work
USER appuser

ENV NODE_ENV=production \
    WORK_DIR=/work \
    FFMPEG_BIN=ffmpeg \
    FFPROBE_BIN=ffprobe \
    FFMPEG_VERSION=bookworm

CMD ["npm", "run", "-w", "@reelify/ffmpeg-worker", "start"]
