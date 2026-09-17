import { NextResponse } from "next/server";
import { z } from "zod";

import { requireVerifiedUserId } from "@/lib/auth";
import { categoryForItemName } from "@/lib/pantryCategories";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  confirmed: z.array(z.string().trim().min(1).max(60)).max(50),
  removed: z.array(z.string().trim().min(1).max(60)).max(50),
});

// The "under 10 seconds" quick-refresh sheet's submit: re-confirms a handful of
// recently-used ingredients (bumping lastConfirmedAt) and drops any the user says
// they're out of, then bumps the account-level pantryLastConfirmedAt clock that
// drives the staleness nudges.
export async function POST(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const now = new Date();

  await prisma.$transaction([
    ...parsed.data.confirmed.map((name) =>
      prisma.pantryItem.upsert({
        where: { userId_name: { userId: auth.userId, name } },
        create: { name, category: categoryForItemName(name), lastConfirmedAt: now, userId: auth.userId },
        update: { lastConfirmedAt: now },
      }),
    ),
    ...parsed.data.removed.map((name) =>
      prisma.pantryItem.deleteMany({ where: { userId: auth.userId, name } }),
    ),
    prisma.user.update({ where: { id: auth.userId }, data: { pantryLastConfirmedAt: now } }),
  ]);

  return NextResponse.json({ ok: true });
}
