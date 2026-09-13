import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import { z } from "zod";

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

const patchSchema = z.object({
  personalNotes: z.string().max(4000).nullable().optional(),
  folderId: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (parsed.data.folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: parsed.data.folderId } });
    if (!folder) {
      return NextResponse.json({ error: "That folder doesn't exist." }, { status: 400 });
    }
  }

  const recipe = await prisma.recipe.update({
    where: { id },
    data: parsed.data,
  });
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
