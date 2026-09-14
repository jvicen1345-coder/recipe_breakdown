import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function userPayload(user: {
  id: string;
  email: string;
  name: string | null;
  showThisWeekCard: boolean;
  emailVerified: boolean;
  plan: string;
  groceryCadence: string | null;
  pantryOnboardedAt: Date | null;
  pantryLastConfirmedAt: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    showThisWeekCard: user.showThisWeekCard,
    emailVerified: user.emailVerified,
    plan: user.plan,
    groceryCadence: user.groceryCadence,
    pantryOnboardedAt: user.pantryOnboardedAt?.toISOString() ?? null,
    pantryLastConfirmedAt: user.pantryLastConfirmedAt?.toISOString() ?? null,
  };
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  return NextResponse.json({ user: userPayload(user) });
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
  return NextResponse.json({ user: userPayload(user) });
}
