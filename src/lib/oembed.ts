export interface TikTokOEmbed {
  caption: string;
  authorHandle: string | null;
  thumbnailUrl: string | null;
}

/**
 * Fetches a TikTok video's public caption/author/thumbnail via its oEmbed endpoint —
 * no video download required. Used as the "lite" pipeline on hosts (e.g. Vercel) that
 * can't run yt-dlp/ffmpeg. Doesn't include spoken narration or on-screen text, only
 * whatever the caption/hashtags say.
 */
export async function fetchTikTokOEmbed(url: string): Promise<TikTokOEmbed> {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;

  let res: Response;
  try {
    res = await fetch(oembedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeBreakdownBot/1.0)" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Couldn't reach TikTok to read that video's info. Please try again.");
  }

  if (!res.ok) {
    throw new Error(
      `TikTok didn't return info for that link (status ${res.status}). It may be private, region-locked, age-restricted, or removed.`,
    );
  }

  const data = (await res.json()) as {
    title?: string;
    author_unique_id?: string;
    author_name?: string;
    thumbnail_url?: string;
  };

  if (!data.title) {
    throw new Error("TikTok didn't return a caption for that link.");
  }

  return {
    caption: data.title,
    // `author_unique_id` is the actual @handle; `author_name` is the display
    // name (can contain spaces/emoji), so prefer the handle when present.
    authorHandle: data.author_unique_id ?? data.author_name ?? null,
    thumbnailUrl: data.thumbnail_url ?? null,
  };
}
