# Cutesy Eats 🌸🍴

Paste a saved TikTok cooking video and get a structured, cookable recipe out of it: ingredients,
step-by-step instructions, make time, difficulty, an estimated grocery cost, the dominant protein,
whether it's vegan/vegetarian/pescatarian/omnivore, and estimated per-serving nutrition facts
(calories, protein, carbs, fat, fiber, sugar, sodium).

Saved recipes live across three pages, tied together by the navbar:

- **Home** — everything in one scroll: the "Break it down" input, a centered "Feeling indecisive?"
  card with the "Cook Tonight? 🌙" swiper button, a compact "This Week" nutrition card, a "Cook
  something tonight?" pill row (Quick / Budget / High Protein / Low Calorie / Vegan / Vegetarian /
  Pescatarian / Easy / Comfort Food) that filters the "Your Recipes" grid below by those criteria —
  genuinely wired to each recipe's real fields (time, price, protein, nutrition, diet type,
  difficulty), not placeholder data — and the full "Your Recipes" grid itself: search, filter by
  diet, sort (Recently Added / Cook Time / Cost) via compact dropdown pills, organize into folders
  (e.g. "Meal Prep 💪", deletable via the × on each folder pill — recipes inside are just
  unassigned, not deleted), and hover a card for quick "View 👀" / "Save to List 🛒" actions. A
  small "Showing N recipes · …" line above the grid always summarizes whatever combination of
  search/diet/folder/Cook-Tonight/sort filters is currently active. The navbar no longer has a
  separate "My Recipes" link; the mobile bottom bar's search icon and the desktop "Home" link both
  smooth-scroll straight to this grid. The search bar doubles as an LLM-powered smart search: type
  3+ characters and, after a short debounce, it also asks Claude to match your saved recipes
  against the request's *meaning* (ingredients, time, cost, diet, protein, even "haven't made in a
  while") rather than just the title — a plain substring match on title/author stays live
  throughout so results never go blank while waiting, and it silently falls back to that substring
  match if the request fails or `ANTHROPIC_API_KEY` isn't configured. The grid itself only renders
  24 cards at a time with a "Load More 🌸" button to reveal 24 more, plus a dashed "Add new
  recipes, girly ✨" card linking out to TikTok once every match is loaded — filtering/sorting/
  searching still run over your whole saved library, but the DOM/image load stays light even with
  a large collection; changing any filter resets back to the first page.
- **Grocery & Pantry** — one sage-accented page with an in-page tab switcher between two views:
  - **Grocery List** — built from whatever you've added via a card's "Save to List 🛒" action (this
    is intentionally independent from a recipe's own cook-along ingredient checklist, so checking
    something off while cooking doesn't touch your shopping list and vice versa), grouped into
    Produce/Proteins/Dairy/Pantry, with its own cross-off checkboxes, a "Copy list" button, and a
    "Clear list" button to empty it out.
  - **My Pantry** — staples you keep stocked. Tap common staples (grouped into Oils & Vinegars /
    Spices / Grains & Pasta / Dairy / Canned Goods) to toggle them on, or search to add anything
    else. Once you've added a few items, every recipe card and detail view shows a "🧺 X/Y
    ingredients" badge, and this tab surfaces how many saved recipes you're 80%+ of the way to
    being able to make.
- **This Week** — a lightweight nutrition snapshot built only from recipes you've actually cooked
  (via Cook Mode's "I made this!"), never manual logging: weekly calorie/protein/carb/fat totals, a
  daily bar chart, a macro breakdown, the list of what you cooked, and "Recommended for you" picks
  from your saved-but-uncooked recipes that would balance the week's macros. The compact homepage
  version is deliberately a different, lighter card (its own `/api/nutrition-home-card` route, kept
  fully separate from this tab's data): instead of a big calorie number it shows a Mon–Sun row of
  which days you cooked (with a subtle "🔥 Nd streak" pill for consecutive days), the week's
  Protein/Carbs/Fat split as bars, and a line recommending a saved-but-uncooked recipe based on
  which macro you're furthest from and how many calories are left in the day (generic 2000
  cal/100g protein/250g carb/65g fat reference targets — there's no user profile/goals system).

On mobile, the top nav is replaced by a fixed bottom bar (Home / Search / Add / Grocery / Week) so
the main actions stay one thumb-tap away — and on mobile, navigation lives *only* in that bottom
bar; the top header (logo, links) is desktop-only.

Clicking any recipe card opens a full detail view in a modal (a direct link to `/recipes/[id]` still
works as a real page) with a servings adjuster that scales every ingredient quantity live, the
per-serving calories, a personal notes box, a pantry-match badge, and the full nutrition breakdown.

### Cook Mode 🍳

"Start Cooking" on any recipe opens a full-screen, distraction-free guided flow: one step at a time
in a large serif font, with the previous/next step teased in small muted text above/below, a thin
progress bar at the top, and swipe or arrow-button navigation. Steps with a detected duration
("cook for 6-7 minutes", "simmer for 20 minutes" — parsed by `src/lib/cookTimers.ts`) surface a
"Start Timer ⏱" button; timers run concurrently in a pill bar pinned to the bottom, pulse and
vibrate (where supported) when done. The final step becomes a celebration screen — confetti, "I
made this! 💕", and a 5-star rating — which logs a `CookLog` row (used by the nutrition snapshot)
and marks the recipe cooked.

Exiting mid-recipe (the ✕ button) offers a "Save my spot" switch, on by default — leave it on and
the button becomes "Resume Cooking (Step X)" next time, picking back up right where you left off
with a toast confirming it; flip it off before exiting to discard that progress and start over
(`src/lib/cookModeStorage.ts`).

### Cook Tonight? Swiper 🌙

A Tinder-style discovery mode ("Feeling indecisive?" on the homepage) for when you don't know what
to make. Recipes not cooked in 7+ days (or never) surface first, ones cooked 3-7 days ago are
neutral, and anything cooked in the last 3 days sinks to the back — shuffled within each bucket.
Swipe or tap ✅/👋; a right swipe drops you straight into Cook Mode for that recipe.

### Ingredient substitutions 🔄

Tap any ingredient in a recipe's list to open a bottom sheet with 2-3 hardcoded smart swaps (see
`src/lib/substitutions.ts` — heavy cream, butter, chicken, parmesan, pasta, eggs, milk, and flour
are covered) each with a note on how it changes the dish, a diet tag where relevant, and a badge if
the substitute is already in your pantry or on your grocery list.

## How it works

The app automatically picks one of two pipelines per request, depending on whether `yt-dlp` is
actually installed on the host it's running on — no configuration needed either way.

**Lite pipeline** (used when `yt-dlp` isn't available — e.g. on Vercel):

1. Fetches the video's caption, hashtags, author, and thumbnail from TikTok's public oEmbed
   endpoint — a normal web request, no video download.
2. Sends that caption plus any notes you typed in to Claude, which returns a structured recipe
   breakdown.

No spoken narration or on-screen text is read in this mode, so accuracy depends on how much the
caption/hashtags say — use the "Add notes" field to fill in anything the caption leaves out.

**Full pipeline** (used when `yt-dlp` + `ffmpeg` are installed — e.g. the included Docker image):

1. **Download** — [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) fetches the video file and its
   metadata (caption, hashtags, uploader, duration).
2. **Extract** — `ffmpeg` pulls the audio track and a handful of evenly-spaced frames from the
   video.
3. **Transcribe** — the audio is sent to OpenAI's Whisper API to capture any spoken narration.
4. **Analyze** — the caption, transcript, sampled frames (read for on-screen ingredient lists/steps),
   and any notes you typed in are sent to Claude for the structured breakdown.
5. The video/audio are discarded after analysis; one extracted frame is kept as the thumbnail
   (saved to local disk).

Both pipelines produce the same kind of result (title, ingredients, instructions, time, difficulty,
price, protein/diet type, nutrition facts) and save to the same Postgres database. Nutrition facts
are a per-serving estimate from the same Claude analysis step, reasoned from the ingredients and
quantities like a nutrition-label estimate — not a measured or database-verified value.

### Importing a whole Collection

TikTok lets you group saved videos into a Collection with its own shareable link
(`tiktok.com/@user/collection/...`, or a `tiktok.com/t/...` short link that redirects to one).
"Import a whole Collection instead" (below the main form) lets you paste that link, preview every
video in it (title, thumbnail, uploader), uncheck any you don't want, and import the rest — each
one runs through the normal pipeline and streams into your library as it finishes.

This needs `yt-dlp` to list the collection's contents, so — like the full pipeline — it only works
on a self-hosted deployment, not Vercel. The app checks for `yt-dlp` on startup and hides this UI
entirely when it isn't available, so it won't show up (or offer something that can't work) on a
serverless deployment.

## Prerequisites

- Node.js 20+
- A Postgres database (e.g. [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres),
  [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app), or a
  local instance for development)
- An [Anthropic API key](https://console.anthropic.com/) (required — this is what builds the
  structured recipe)
- Optional, only for the full pipeline: [`yt-dlp`](https://github.com/yt-dlp/yt-dlp#installation)
  and `ffmpeg`/`ffprobe` on your `PATH` (or set `YT_DLP_PATH` / `FFMPEG_PATH` / `FFPROBE_PATH`), plus
  an [OpenAI API key](https://platform.openai.com/) for transcription. Without these, the app still
  works fully — it just uses the lite pipeline (see "How it works" above).

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

## Deploying (Railway, Render, Fly.io, a VPS, ...)

The included `Dockerfile` installs `ffmpeg` and a standalone `yt-dlp` binary alongside the app, so
the full pipeline — not just the web UI — works once deployed. `railway.json` configures the build
(from the Dockerfile) and a `/api/health` healthcheck so Railway waits for a new deploy to actually
be serving requests before cutting traffic over. Any host that builds from a Dockerfile works the
same way; Railway is a straightforward option:

1. New Project → **Deploy from GitHub repo** → pick this repo and branch. Railway detects the
   `Dockerfile` (and `railway.json`) and builds from it automatically.
2. Add environment variables (Project → Variables): `DATABASE_URL`, `ANTHROPIC_API_KEY`, and
   `AUTH_SECRET` (a random string — see `.env.example`; without it, login sessions fall back to an
   insecure dev-only secret) are the ones you need for a real deployment. Optionally add
   `OPENAI_API_KEY` / `ANTHROPIC_MODEL` / `OPENAI_TRANSCRIBE_MODEL` and anything else from
   `.env.example` (email verification, Stripe, Google login, affiliate IDs). You can point
   `DATABASE_URL` at any reachable Postgres instance, including one you set up elsewhere (e.g. Neon).
3. Deploy. `DATABASE_URL` needs to be set before the build step even runs (`next build` fails fast
   without it, though it doesn't need to be reachable yet) — the container then runs
   `prisma migrate deploy` at startup, once it's actually live, so the schema gets created on first
   boot. This runs at container start rather than during the image build (unlike the plain
   `npm run build` used for a Vercel deploy) because a Postgres add-on's private-network host is
   usually only reachable from the running container, not from the build environment.
4. Attach a persistent Volume mounted at `/app/data` so uploaded community-recipe photos survive
   redeploys (without one, `data/community-uploads` resets each time the container rebuilds — saved
   recipes and their text/metadata in Postgres are unaffected either way, only those photo files).

Deploying to **Vercel** (or any other serverless host) works too — it just automatically runs the
lite pipeline instead, since `yt-dlp` isn't available there. No extra setup beyond `DATABASE_URL`
and `ANTHROPIC_API_KEY`.

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

- **On the lite pipeline (Vercel etc.), accuracy depends on the caption.** No spoken narration or
  on-screen text is read — only the caption/hashtags and whatever you type into "Add notes." Videos
  that put the recipe in the caption work well; videos that only say it out loud or show it as
  on-screen text need the full pipeline, or your own notes to fill the gap.
- **TikTok changes often.** This affects both pipelines differently: the lite pipeline depends on
  TikTok's oEmbed endpoint staying available; the full pipeline depends on `yt-dlp` staying current
  with TikTok's site (`pip install -U yt-dlp` or your package manager's equivalent if downloads stop
  working).
- **Private, age-restricted, region-locked, or removed videos** won't resolve on either pipeline.
- **Time, difficulty, price, and nutrition facts are estimates** from a language model reasoning
  over the video's content and general culinary knowledge, not measured facts — treat them as a
  helpful ballpark, not a lab-verified nutrition label.
- **This is a single-user app** by design — no accounts/auth. If you deploy it somewhere shared,
  put it behind your own access control.
- **The full pipeline's requests can take 30–90+ seconds** (video download + transcription +
  analysis); the lite pipeline is much faster (a couple of seconds). The API route sets
  `maxDuration = 300` regardless, but confirm your hosting platform allows long-running server
  functions if you're running the full pipeline.

## Project structure

- `src/lib/oembed.ts` — lite pipeline: fetches caption/author/thumbnail via TikTok's oEmbed endpoint
- `src/lib/tiktok.ts` — full pipeline: downloads video + metadata via `yt-dlp`
- `src/lib/media.ts` — full pipeline: extracts audio/frames via `ffmpeg`
- `src/lib/transcribe.ts` — full pipeline: Whisper transcription
- `src/lib/analyze.ts` — Claude-powered structured recipe extraction (both pipelines)
- `src/lib/pipeline.ts` — picks a pipeline (based on whether `yt-dlp` is installed) and persists the result
- `src/lib/collection.ts` — lists a Collection's videos via `yt-dlp --flat-playlist`
- `src/app/api/collections/preview` — lists a Collection's videos for the picker UI
- `src/app/api/collections/import` — imports selected videos, streaming one result per line (NDJSON)
- `src/components/CollectionImport.tsx` — the preview/select/import UI
- `src/app/api/recipes` — list/create recipes; `src/app/api/recipes/[id]` — read/delete/patch one
  (patch supports `personalNotes` and `folderId`)
- `src/app/api/folders` — list/create folders; `src/app/api/folders/[id]` — delete one
- `src/app/api/search-recipes` — Claude-powered smart search: given a natural-language query and
  lightweight recipe summaries, returns matching recipe ids ranked by relevance
- `src/app/api/media/[filename]` — serves saved thumbnails
- `src/lib/scaling.ts` — scales an ingredient quantity string for the servings adjuster
- `src/lib/groceryCategories.ts` — keyword-based Produce/Proteins/Dairy/Pantry categorization
- `src/lib/checklistStorage.ts` — localStorage contract for a single recipe's own cook-along
  checkmarks (ticking off ingredients/steps while actually cooking) — separate from the grocery list
- `src/lib/groceryListStorage.ts` — localStorage contract for the grocery list itself: which
  recipe/ingredient pairs are on it and which are crossed off, independent of any recipe's own
  checklist, plus `clearGroceryList()` for the "Clear list" button
- `src/components/RecipeDetailContent.tsx` — the recipe detail body (badges, servings adjuster,
  checklist, notes, nutrition, folder) shared by both the modal and the standalone page
- `src/components/RecipeDetailModal.tsx` / `RecipeModalProvider.tsx` — the modal recipe view opened
  from any recipe card, plus the context that opens it from anywhere in the app
- `src/components/MyRecipesGrid.tsx` — the "Your Recipes" grid, embedded on the Home page, including
  folder creation/deletion
- `src/components/GroceryPantryPage.tsx`, `src/app/grocery-list/page.tsx` — the combined
  Grocery/Pantry page and its in-page tab switcher
- `src/components/GroceryList.tsx` — the Grocery List tab's content
- `src/app/page.tsx`, `src/components/RecipeLibrary.tsx` — Home (hero, input, dashboard cards, Cook
  Tonight, and the Your Recipes grid all in one page)
- `src/app/recipes/[id]/page.tsx` — the standalone recipe detail page (direct links/sharing)
- `src/components/CookMode.tsx` — the full-screen guided cooking flow (steps, timers, celebration)
- `src/lib/cookTimers.ts` — parses a duration out of an instruction step's text
- `src/app/api/recipes/[id]/cook` — logs an "I made this!" event (`CookLog`: recipe, timestamp,
  optional rating)
- `src/components/CookTonightSwiper.tsx` — the Tinder-style "Cook Tonight?" discovery mode
- `src/components/PantryProvider.tsx` — app-wide context that fetches/mutates pantry items once
- `src/lib/pantryMatch.ts` — fuzzy text matching between pantry staples and ingredient text
- `src/app/api/pantry`, `src/app/api/pantry/[id]` — list/create pantry items; delete one
- `src/components/PantryPageClient.tsx` — the My Pantry tab's content
- `src/components/BottomSheet.tsx` — shared draggable blush bottom-sheet shell
- `src/components/SubstitutionSheet.tsx`, `src/lib/substitutions.ts` — the ingredient substitution
  tapper and its hardcoded lookup table
- `src/app/api/nutrition-snapshot` — aggregates a week's `CookLog` entries into totals, a daily
  breakdown, macro %, an insight line, and balancing recommendations from uncooked saves
- `src/components/NutritionSnapshotPageClient.tsx`, `src/app/nutrition/page.tsx` — the full weekly
  nutrition snapshot page with a week selector
- `src/app/api/nutrition-home-card` — the homepage card's own, separate aggregation: day-cooked
  marks + streak, week macro %, and a today-remaining-budget recommendation
- `src/components/NutritionSnapshotCard.tsx` — the compact "This Week" homepage card
- `src/lib/cookTonightFilters.ts` — the "Cook something tonight?" pill definitions/matcher, shared
  by the homepage pill row and the Your Recipes grid it filters
- `src/app/icon.tsx`, `src/app/apple-icon.tsx` — generated "CE" app icons (coral→rose-deep gradient,
  matching the rest of the app) for browser tabs and "Add to Home Screen"
- `src/app/manifest.ts` — web app manifest (name, theme color, icon) for installing as an app
