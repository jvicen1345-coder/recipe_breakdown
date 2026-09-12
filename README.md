# Recipe Breakdown

Paste a saved TikTok cooking video and get a structured, cookable recipe out of it: ingredients,
step-by-step instructions, make time, difficulty, an estimated grocery cost, the dominant protein,
and whether it's vegan/vegetarian/pescatarian/omnivore. Saved recipes are kept in a local library
you can revisit.

## How it works

For each submitted TikTok link:

1. **Download** — [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) fetches the video file and its
   metadata (caption, hashtags, uploader, duration).
2. **Extract** — `ffmpeg` pulls the audio track and a handful of evenly-spaced frames from the
   video.
3. **Transcribe** — the audio is sent to OpenAI's Whisper API to capture any spoken narration.
4. **Analyze** — the caption, transcript, sampled frames (read for on-screen ingredient lists/steps),
   and any notes you typed in are sent to Claude, which returns a structured recipe breakdown
   (title, ingredients, instructions, time, difficulty, price, protein/diet type).
5. **Save** — the result is stored in a Postgres database, along with a thumbnail pulled from
   the video itself (saved to local disk).

The original video file and audio are discarded after analysis — only the extracted text/metadata
and one thumbnail frame are kept.

## Prerequisites

- Node.js 20+
- A Postgres database (e.g. [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres),
  [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app), or a
  local instance for development)
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp#installation) on your `PATH` (or set `YT_DLP_PATH`)
- `ffmpeg` and `ffprobe` on your `PATH` (or set `FFMPEG_PATH` / `FFPROBE_PATH`)
- An [Anthropic API key](https://console.anthropic.com/) (required — this is what builds the
  structured recipe)
- An [OpenAI API key](https://platform.openai.com/) (optional — enables transcription of spoken
  narration; without it, analysis relies on the caption, on-screen text, and your notes)

## Setup

```bash
npm install             # also generates the Prisma client via `postinstall`
cp .env.example .env    # fill in DATABASE_URL, ANTHROPIC_API_KEY (and OPENAI_API_KEY if you have one)
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run build` also runs `prisma migrate deploy` first, so a normal deploy (Vercel or otherwise)
applies any pending schema migrations automatically as long as `DATABASE_URL` is set — you only
need to run it by hand for local dev before `npm run dev`, since `dev` doesn't build.

## Environment variables

See [`.env.example`](./.env.example) for the full list. The important ones:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `ANTHROPIC_API_KEY` | yes | Powers the recipe breakdown itself |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-sonnet-5` |
| `OPENAI_API_KEY` | no | Enables Whisper transcription of narration |
| `OPENAI_TRANSCRIBE_MODEL` | no | Defaults to `whisper-1` |
| `YT_DLP_PATH` / `FFMPEG_PATH` / `FFPROBE_PATH` | no | Override binary locations |

## Notes and limitations

- **TikTok changes often.** `yt-dlp` is what makes downloads work; if TikTok changes its site and
  links stop resolving, update it (`pip install -U yt-dlp` or your package manager's equivalent).
- **Private, age-restricted, region-locked, or removed videos** can't be downloaded.
- **No spoken narration + no on-screen text** means there's little for the analysis step to work
  with — use the "Add notes" field on the form to paste in anything you noticed (ingredient list,
  substitutions) to improve accuracy.
- **Time, difficulty, and price are estimates** from a language model reasoning over the video's
  content and general culinary knowledge, not measured facts — treat them as a helpful ballpark,
  not a guarantee.
- **This is a single-user app** by design — no accounts/auth. If you deploy it somewhere shared,
  put it behind your own access control.
- **Requests can take 30–90+ seconds** (video download + transcription + analysis). The API route
  sets `maxDuration = 300`, but confirm your hosting platform allows long-running server functions.
- **Serverless hosts (e.g. Vercel) are a poor fit for the download/analyze pipeline itself.** The
  database is Postgres (works fine anywhere), but `src/lib/tiktok.ts` and `src/lib/media.ts` shell
  out to `yt-dlp`/`ffmpeg` binaries, which typical serverless Node runtimes don't provide and can't
  easily install at request time. Thumbnails are also written to local disk
  (`data/uploads`, served by `src/app/api/media/[filename]`), which won't persist on a read-only or
  ephemeral filesystem. For that reason, run this on a host with a persistent filesystem and shell
  access — a VPS/Docker container, or a platform like Railway/Render/Fly.io — or adapt those two
  pieces to a container-based execution environment and object storage (e.g. S3) if you need
  serverless.

## Project structure

- `src/lib/tiktok.ts` — downloads video + metadata via `yt-dlp`
- `src/lib/media.ts` — extracts audio/frames via `ffmpeg`
- `src/lib/transcribe.ts` — Whisper transcription
- `src/lib/analyze.ts` — Claude-powered structured recipe extraction
- `src/lib/pipeline.ts` — orchestrates the steps above and persists the result
- `src/app/api/recipes` — list/create recipes; `src/app/api/recipes/[id]` — read/delete one
- `src/app/api/media/[filename]` — serves saved thumbnails
- `src/app/page.tsx`, `src/app/recipes/[id]/page.tsx` — the UI
