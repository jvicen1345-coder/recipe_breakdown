# Runs the Next.js app plus the yt-dlp/ffmpeg pipeline it shells out to.
# Needs a host with a persistent filesystem and shell access (Render, Railway,
# Fly.io, a VPS) — this will NOT work on a serverless platform like Vercel.
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg ca-certificates curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
# postinstall runs `prisma generate`, which needs the schema + config present
# before `npm ci` — copy those ahead of the rest of the source so Docker's
# layer cache still only re-runs `npm ci` when deps or the schema change.
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .

ENV NODE_ENV=production
# Just the Next.js build here, not `npm run build` — that also runs
# `prisma migrate deploy`, which needs a reachable database, and a
# Render/Railway Postgres's private-network host generally isn't reachable
# from the build environment (only from the running container). Migrations
# run at container start instead, once the real DATABASE_URL is live.
#
# `next build` still needs DATABASE_URL to be *set* (src/lib/prisma.ts
# throws at module load otherwise, which fails page-data collection) even
# though it never connects at build time — and most hosts (Render/Railway
# included) only inject configured variables into the running container,
# not into the `docker build` step itself. This placeholder satisfies that
# check; the real value the host injects at container start overrides it.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/placeholder"
RUN npx next build

EXPOSE 3000
# Retries migrate deploy several times before giving up. A serverless Postgres
# (e.g. Neon) waking from suspend can cost a failed attempt — Prisma's
# client-side wait for the advisory lock is a fixed ~10s, so one failure isn't
# conclusive; 6 tries with a short gap gives the compute time to wake up (or
# an overlapping deploy's own migration to clear) before this deploy actually
# fails.
CMD ["sh", "-c", "i=0; until npx prisma migrate deploy; do i=$((i+1)); [ $i -ge 6 ] && exit 1; echo \"migrate deploy failed, retrying in 8s ($i/6)...\"; sleep 8; done; npm start"]
