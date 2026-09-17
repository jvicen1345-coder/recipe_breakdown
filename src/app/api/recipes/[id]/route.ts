import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId, requireVerifiedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UPLOADS_DIR } from "@/lib/pipeline";
import { toRecipeDto } from "@/lib/types";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe || recipe.userId !== userId) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }
  return NextResponse.json({ recipe: toRecipeDto(recipe) });
}

const patchSchema = z.object({
  personalNotes: z.string().max(4000).nullable().optional(),
  folderId: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (parsed.data.folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: parsed.data.folderId } });
    if (!folder || folder.userId !== auth.userId) {
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
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe || recipe.userId !== auth.userId) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  await prisma.recipe.delete({ where: { id } });

  if (recipe.thumbnailPath) {
    await fs.rm(path.join(UPLOADS_DIR, recipe.thumbnailPath), { force: true });
  }

  return new NextResponse(null, { status: 204 });
}
