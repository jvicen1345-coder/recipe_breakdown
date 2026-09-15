// Server-side "Made It" logic: capped heart points and report-triggered hiding.
// The plain constants both this file and the client need live in madeItConstants.ts.
import { awardPoints } from "./community";
import { HEART_POINT_CAP, REPORT_HIDE_THRESHOLD } from "./madeItConstants";
import { prisma } from "./prisma";

export { MAX_CAPTION_LENGTH, POINTS_PER_MADE_IT_POST } from "./madeItConstants";

/**
 * Records a new heart (idempotent per user via the DB's unique constraint) and, if
 * the poster hasn't already hit the per-post cap, awards them a point. Hearts are
 * permanent — there's no unheart — so this can only ever run once per user per post.
 */
export async function heartPost(postId: string, userId: string): Promise<{ ok: boolean; alreadyHearted: boolean }> {
  const post = await prisma.madeItPost.findUnique({ where: { id: postId } });
  if (!post) return { ok: false, alreadyHearted: false };
  if (post.userId === userId) return { ok: false, alreadyHearted: false };

  const existing = await prisma.madeItHeart.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) return { ok: true, alreadyHearted: true };

  const heartsSoFar = await prisma.madeItHeart.count({ where: { postId } });

  await prisma.madeItHeart.create({ data: { postId, userId } });

  if (heartsSoFar < HEART_POINT_CAP) {
    await awardPoints(post.userId, 1);
    await prisma.notification.create({
      data: { userId: post.userId, message: `Someone loved your ${await recipeTitleFor(post.recipeId)} 💕` },
    });
  }

  return { ok: true, alreadyHearted: false };
}

async function recipeTitleFor(recipeId: string): Promise<string> {
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId }, select: { title: true } });
  return recipe?.title ?? "recipe";
}

/** Records a report (idempotent per user) and auto-hides the post once the threshold is hit. */
export async function reportPost(postId: string, reporterUserId: string): Promise<{ ok: boolean }> {
  const post = await prisma.madeItPost.findUnique({ where: { id: postId } });
  if (!post) return { ok: false };

  await prisma.madeItReport.upsert({
    where: { postId_reporterUserId: { postId, reporterUserId } },
    create: { postId, reporterUserId },
    update: {},
  });

  const reportCount = await prisma.madeItReport.count({ where: { postId } });
  if (reportCount >= REPORT_HIDE_THRESHOLD && !post.hiddenAt) {
    await prisma.madeItPost.update({ where: { id: postId }, data: { hiddenAt: new Date() } });
  }

  return { ok: true };
}
