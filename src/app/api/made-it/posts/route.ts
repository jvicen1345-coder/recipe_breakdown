import { NextResponse } from "next/server";
import { z } from "zod";

import { requireVerifiedUserId } from "@/lib/auth";
import { awardPoints } from "@/lib/community";
import { MAX_CAPTION_LENGTH, POINTS_PER_MADE_IT_POST } from "@/lib/madeIt";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  recipeId: z.string().min(1),
  photoUrl: z.string().min(1),
  photoWidth: z.number().int().positive(),
  photoHeight: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  caption: z.string().trim().max(MAX_CAPTION_LENGTH).optional().nullable(),
});

// Creates a "Made It" community post — the core, always-on action of the share flow
// (the flow's "just comment on TikTok" path never calls this). Awards +1 point.
export async function POST(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid post." }, { status: 400 });
  }
  const data = parsed.data;

  const recipe = await prisma.recipe.findUnique({ where: { id: data.recipeId }, select: { id: true } });
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  const post = await prisma.madeItPost.create({
    data: {
      userId: auth.userId,
      recipeId: data.recipeId,
      photoUrl: data.photoUrl,
      photoWidth: data.photoWidth,
      photoHeight: data.photoHeight,
      rating: data.rating,
      caption: data.caption?.trim() || null,
    },
  });

  const points = await awardPoints(auth.userId, POINTS_PER_MADE_IT_POST);

  return NextResponse.json({ ok: true, postId: post.id, points });
}

const FEED_PAGE_SIZE = 20;

// GET ?filter=everyone|this_week — "following" isn't listed here: there's no
// follow-a-user feature in the app yet, so the client shows an honest empty state
// for that pill rather than calling an endpoint that can't actually filter by it.
export async function GET(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") === "this_week" ? "this_week" : "everyone";

  const where = {
    hiddenAt: null,
    ...(filter === "this_week" ? { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } : {}),
  };

  const posts = await prisma.madeItPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: FEED_PAGE_SIZE,
    include: {
      recipe: { select: { id: true, title: true, authorHandle: true, sourceUrl: true } },
      hearts: { where: { userId: auth.userId }, select: { id: true } },
      _count: { select: { hearts: true } },
    },
  });

  return NextResponse.json({
    posts: posts.map((post) => ({
      id: post.id,
      photoUrl: post.photoUrl,
      photoWidth: post.photoWidth,
      photoHeight: post.photoHeight,
      caption: post.caption,
      rating: post.rating,
      createdAt: post.createdAt.toISOString(),
      heartsCount: post._count.hearts,
      heartedByMe: post.hearts.length > 0,
      recipe: post.recipe,
    })),
  });
}
