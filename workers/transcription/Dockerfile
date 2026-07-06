# Transcription integration worker (plan §10). Lightweight (no ffmpeg).
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY db ./db
COPY services ./services
COPY workers ./workers
RUN npm ci
RUN npx prisma generate --schema db/schema.prisma

RUN useradd --system --uid 10001 appuser
USER appuser

ENV NODE_ENV=production
CMD ["npm", "run", "-w", "@reelify/transcription-worker", "start"]
