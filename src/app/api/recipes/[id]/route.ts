import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { UPLOADS_DIR } from "@/lib/pipeline";
import { toRecipeDto } from "@/lib/types";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }
  return NextResponse.json({ recipe: toRecipeDto(recipe) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  await prisma.recipe.delete({ where: { id } });

  if (recipe.thumbnailPath) {
    await fs.rm(path.join(UPLOADS_DIR, recipe.thumbnailPath), { force: true });
  }

  return new NextResponse(null, { status: 204 });
}
