import { z } from "zod";

import { requireVerifiedUserId } from "@/lib/auth";
import { createRecipeFromUrl, RecipeAlreadyExistsError, toUserFacingPipelineError } from "@/lib/pipeline";
import { countRecipesThisMonth, FREE_RECIPE_LIMIT, isPro, PRO_MONTHLY_RECIPE_LIMIT } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { InvalidTikTokUrlError } from "@/lib/tiktok";
import { toRecipeDto } from "@/lib/types";

// Importing several videos sequentially (each running the full download/
// transcribe/analyze pipeline) can take a while — this streams one result
// line at a time rather than waiting for all of them before responding.
// Generous ceiling for that; Render's web services don't impose Vercel's
// old serverless-function timeout, but this still bounds a runaway request.
export const maxDuration = 300;

const schema = z.object({
  urls: z.array(z.string().trim().min(1)).min(1).max(50),
});

export async function POST(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { "Content-Type": "application/json" },
    });
  }

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
  const { userId } = auth;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      const user = await prisma.user.findUnique({ where: { id: userId } });
      const userIsPro = user ? isPro(user) : false;

      for (const url of urls) {
        if (userIsPro) {
          const monthlyCount = await countRecipesThisMonth(userId);
          if (monthlyCount >= PRO_MONTHLY_RECIPE_LIMIT) {
            send({
              url,
              status: "error",
              message: `You've hit Pro's ${PRO_MONTHLY_RECIPE_LIMIT}-recipe monthly limit — it resets in a few weeks.`,
              reason: "monthly-limit",
            });
            continue;
          }
        } else {
          const savedCount = await prisma.recipe.count({ where: { userId } });
          if (savedCount >= FREE_RECIPE_LIMIT) {
            send({ url, status: "error", message: `You've hit the free plan's ${FREE_RECIPE_LIMIT}-recipe limit.`, reason: "recipe-limit" });
            continue;
          }
        }
        try {
          const recipe = await createRecipeFromUrl(url, userId);
          send({ url, status: "ok", recipe: toRecipeDto(recipe) });
        } catch (err) {
          if (err instanceof RecipeAlreadyExistsError) {
            send({ url, status: "duplicate", recipeId: err.recipeId });
          } else if (err instanceof InvalidTikTokUrlError) {
            send({ url, status: "error", message: err.message });
          } else {
            console.error("[api/collections/import] item failed:", url, err);
            const rawMessage = err instanceof Error ? err.message : "Failed to analyze that video.";
            send({ url, status: "error", message: toUserFacingPipelineError(rawMessage, user?.email ?? "") });
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
