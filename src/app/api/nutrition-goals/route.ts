import { NextResponse } from "next/server";
import { z } from "zod";

import { requireVerifiedUserId } from "@/lib/auth";
import { clampGoal } from "@/lib/nutritionGoals";
import { prisma } from "@/lib/prisma";

const goalsSchema = z.object({
  calories: z.number().int().positive(),
  protein: z.number().int().positive(),
  carbs: z.number().int().positive(),
  fat: z.number().int().positive(),
});

export async function PATCH(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = goalsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid goals." }, { status: 400 });
  }
  const { calories, protein, carbs, fat } = parsed.data;

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      goalCalories: clampGoal("calories", calories),
      goalProtein: clampGoal("protein", protein),
      goalCarbs: clampGoal("carbs", carbs),
      goalFat: clampGoal("fat", fat),
    },
  });

  return NextResponse.json({ ok: true });
}
