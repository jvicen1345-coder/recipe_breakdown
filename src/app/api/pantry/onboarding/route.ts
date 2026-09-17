import { NextResponse } from "next/server";
import { z } from "zod";

import { requireVerifiedUserId } from "@/lib/auth";
import { categoryForItemName } from "@/lib/pantryCategories";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  items: z.array(z.string().trim().min(1).max(60)).max(200),
  cadence: z.enum(["weekly", "biweekly", "whenever"]),
});

export async function POST(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const now = new Date();

  await prisma.$transaction([
    ...parsed.data.items.map((name) =>
      prisma.pantryItem.upsert({
        where: { userId_name: { userId: auth.userId, name } },
        create: { name, category: categoryForItemName(name), lastConfirmedAt: now, userId: auth.userId },
        update: { lastConfirmedAt: now },
      }),
    ),
    prisma.user.update({
      where: { id: auth.userId },
      data: { groceryCadence: parsed.data.cadence, pantryOnboardedAt: now, pantryLastConfirmedAt: now },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
