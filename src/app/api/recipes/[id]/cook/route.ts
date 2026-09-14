import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

const cookSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const recipe = await prisma.recipe.findFirst({ where: { id, userId } });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = cookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const cookLog = await prisma.cookLog.create({
    data: { recipeId: id, userId, rating: parsed.data.rating },
  });
  const cookCount = await prisma.cookLog.count({ where: { recipeId: id } });

  return NextResponse.json(
    { cookLog: { id: cookLog.id, cookedAt: cookLog.cookedAt.toISOString(), rating: cookLog.rating }, cookCount },
    { status: 201 },
  );
}
