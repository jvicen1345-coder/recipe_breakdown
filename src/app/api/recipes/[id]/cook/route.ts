import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

const cookSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = cookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const cookLog = await prisma.cookLog.create({
    data: { recipeId: id, rating: parsed.data.rating },
  });
  const cookCount = await prisma.cookLog.count({ where: { recipeId: id } });

  return NextResponse.json(
    { cookLog: { id: cookLog.id, cookedAt: cookLog.cookedAt.toISOString(), rating: cookLog.rating }, cookCount },
    { status: 201 },
  );
}
