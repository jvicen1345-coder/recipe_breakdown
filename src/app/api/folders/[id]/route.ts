import { NextResponse } from "next/server";
import { z } from "zod";

import { requireVerifiedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toFolderDto } from "@/lib/types";

interface Params {
  params: Promise<{ id: string }>;
}

const patchFolderSchema = z.object({
  emoji: z.string().trim().min(1).max(8),
});

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder || folder.userId !== auth.userId) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  const updated = await prisma.folder.update({ where: { id }, data: { emoji: parsed.data.emoji } });
  return NextResponse.json({ folder: toFolderDto(updated) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder || folder.userId !== auth.userId) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  // Recipes in this folder are unassigned (folderId → null), not deleted — see the
  // onDelete: SetNull relation in schema.prisma.
  await prisma.folder.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
