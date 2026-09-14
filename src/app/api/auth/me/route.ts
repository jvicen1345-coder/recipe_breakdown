import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, showThisWeekCard: user.showThisWeekCard },
  });
}

const patchSchema = z.object({
  showThisWeekCard: z.boolean().optional(),
  name: z.string().trim().max(60).nullable().optional(),
});

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id: userId }, data: parsed.data });
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, showThisWeekCard: user.showThisWeekCard },
  });
}
