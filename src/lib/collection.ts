import { runCommand } from "./exec";
import { assertTikTokUrl, YT_DLP_BIN } from "./tiktok";

// Matches downloadTikTok's timeout in tiktok.ts: yt-dlp's default 20s socket
// timeout is too short against TikTok from Render's network and was aborting
// the whole listing over a single slow entry (yt-dlp exits non-zero without
// --ignore-errors even in --flat-playlist mode). 45s * yt-dlp's 3 default
// extractor retries = 135s worst case, so the process ceiling leaves headroom.
const LIST_TIMEOUT_MS = 150_000;
const MAX_ENTRIES = 50;

export interface TikTokCollectionEntry {
  sourceUrl: string;
  title: string;
  uploader: string | null;
  thumbnailUrl: string | null;
}

export interface TikTokCollection {
  title: string;
  entries: TikTokCollectionEntry[];
}

interface RawThumbnail {
  id?: string;
  url?: string;
}

interface RawEntry {
  url?: string;
  title?: string;
  description?: string;
  uploader?: string;
  thumbnails?: RawThumbnail[];
}

/**
 * Lists the videos in a shared TikTok Collection/playlist link via yt-dlp
 * (`--flat-playlist`, so it only reads the listing — no per-video downloads).
 * Requires yt-dlp; there's no lite/oEmbed equivalent for collection listings.
 */
export async function fetchTikTokCollection(url: string): Promise<TikTokCollection> {
  assertTikTokUrl(url);

  const { stdout } = await runCommand(
    YT_DLP_BIN,
    [
      url,
      "--flat-playlist",
      "-J",
      "--no-warnings",
      "--ignore-errors",
      "--socket-timeout",
      "45",
      "--playlist-end",
      String(MAX_ENTRIES),
    ],
    { timeoutMs: LIST_TIMEOUT_MS },
  );

  const data = JSON.parse(stdout) as { title?: string; entries?: RawEntry[] };
  if (!Array.isArray(data.entries)) {
    throw new Error("That link doesn't look like a TikTok collection — try a single video link instead.");
  }

  const entries = data.entries
    .map((e): TikTokCollectionEntry | null => {
      if (!e.url) return null;
      return {
        sourceUrl: e.url,
        title: e.title || e.description?.slice(0, 100) || "Untitled video",
        uploader: e.uploader ?? null,
        thumbnailUrl: pickThumbnail(e.thumbnails),
      };
    })
    .filter((e): e is TikTokCollectionEntry => e !== null);

  return { title: data.title || "TikTok collection", entries };
}

function pickThumbnail(thumbnails?: RawThumbnail[]): string | null {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return null;
  const cover = thumbnails.find((t) => t.id === "cover" && t.url);
  return cover?.url ?? thumbnails[0]?.url ?? null;
}
