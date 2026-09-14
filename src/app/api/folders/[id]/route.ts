import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const folder = await prisma.folder.findFirst({ where: { id, userId } });
  if (!folder) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  // Recipes in this folder are unassigned (folderId → null), not deleted — see the
  // onDelete: SetNull relation in schema.prisma.
  await prisma.folder.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
