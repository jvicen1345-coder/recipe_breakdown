import { z } from "zod";

import { createRecipeFromUrl, RecipeAlreadyExistsError } from "@/lib/pipeline";
import { toRecipeDto } from "@/lib/types";

// Importing several videos sequentially (each running the full download/
// transcribe/analyze pipeline) can take a while — this streams one result
// line at a time rather than waiting for all of them before responding.
// Capped at 300: Vercel's Hobby plan rejects any higher maxDuration outright.
export const maxDuration = 300;

const schema = z.object({
  urls: z.array(z.string().trim().min(1)).min(1).max(50),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "At least one video URL is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { urls } = parsed.data;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      for (const url of urls) {
        try {
          const recipe = await createRecipeFromUrl(url);
          send({ url, status: "ok", recipe: toRecipeDto(recipe) });
        } catch (err) {
          if (err instanceof RecipeAlreadyExistsError) {
            send({ url, status: "duplicate", recipeId: err.recipeId });
          } else {
            console.error("[api/collections/import] item failed:", url, err);
            const message = err instanceof Error ? err.message : "Failed to analyze that video.";
            send({ url, status: "error", message });
          }
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
  });
}
