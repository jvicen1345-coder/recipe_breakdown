# Runs the Next.js app plus the yt-dlp/ffmpeg pipeline it shells out to.
# Needs a host with a persistent filesystem and shell access (Railway, Render,
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
# DATABASE_URL must be set at build time too (this also runs `prisma migrate deploy`).
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
