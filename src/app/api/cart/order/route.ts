import { NextResponse } from "next/server";
import { z } from "zod";

import { requireVerifiedUserId } from "@/lib/auth";
import { isPro } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  provider: z.enum(["instacart", "amazon-fresh", "walmart", "kroger", "doordash"]),
  items: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  // Shop-this-recipe / Smart Cart: the single recipe being shopped for.
  recipeId: z.string().optional().nullable(),
  // Smart Cart only: every recipe that contributed a missing ingredient to this order.
  contributingRecipeIds: z.array(z.string()).max(50).optional(),
  // Smart Cart only: how many ingredients the pantry cross-reference kept out of the cart.
  pantrySavedCount: z.number().int().min(0).optional(),
  // Which UI surface sent this click — powers affiliate-click analytics.
  source: z
    .enum(["recipe_page", "grocery_list", "smart_cart", "girl_dinner", "cook_mode_exit"])
    .optional(),
});

// Logs an affiliate/delivery hand-off from anywhere in the app, stamps every recipe
// that contributed to it with lastOrderedViaAppAt (powers the nutrition snapshot's
// "Ordered via Cutesy Eats" tag), and — for Smart Cart — credits the pantry with
// however many ingredients it kept the user from re-buying. Only Smart Cart (the
// pantry-aware bulk cart) is a Pro perk; every other shopping surface is free so
// affiliate clicks — the whole point of these links — aren't gated behind a paywall.
export async function POST(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { provider, items, recipeId, contributingRecipeIds, pantrySavedCount, source } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (source === "smart_cart" && !isPro(user)) {
    return NextResponse.json(
      { error: "Upgrade to Cutesy Eats Pro to order groceries through the app.", reason: "smart-cart" },
      { status: 402 },
    );
  }

  const now = new Date();
  const recipeIdsToStamp = [...new Set([...(contributingRecipeIds ?? []), ...(recipeId ? [recipeId] : [])])];

  await prisma.$transaction([
    prisma.cartOrder.create({
      data: {
        provider,
        itemsJson: JSON.stringify(items ?? []),
        recipeId: recipeId ?? null,
        source: source ?? null,
        userId: auth.userId,
      },
    }),
    ...recipeIdsToStamp.map((id) =>
      prisma.recipe.updateMany({ where: { id, userId: auth.userId }, data: { lastOrderedViaAppAt: now } }),
    ),
    ...(pantrySavedCount
      ? [
          prisma.user.update({
            where: { id: user.id },
            data: { ingredientsSavedByPantry: { increment: pantrySavedCount } },
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
