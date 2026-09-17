import { NextResponse } from "next/server";
import { z } from "zod";

import { requireVerifiedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const manualMealLogSchema = z.object({
  name: z.string().trim().min(1).max(200),
  caloriesPerServing: z.number().nonnegative().nullable().optional(),
  proteinGrams: z.number().nonnegative().nullable().optional(),
  carbsGrams: z.number().nonnegative().nullable().optional(),
  fatGrams: z.number().nonnegative().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  loggedAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = manualMealLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid meal." }, { status: 400 });
  }
  const data = parsed.data;

  const log = await prisma.manualMealLog.create({
    data: {
      userId: auth.userId,
      name: data.name,
      caloriesPerServing: data.caloriesPerServing ?? null,
      proteinGrams: data.proteinGrams ?? null,
      carbsGrams: data.carbsGrams ?? null,
      fatGrams: data.fatGrams ?? null,
      photoUrl: data.photoUrl ?? null,
      loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
    },
  });

  return NextResponse.json({
    log: {
      id: log.id,
      name: log.name,
      caloriesPerServing: log.caloriesPerServing,
      proteinGrams: log.proteinGrams,
      carbsGrams: log.carbsGrams,
      fatGrams: log.fatGrams,
      photoUrl: log.photoUrl,
      loggedAt: log.loggedAt.toISOString(),
    },
  });
}
