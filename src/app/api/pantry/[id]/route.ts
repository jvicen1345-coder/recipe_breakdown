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
  const item = await prisma.pantryItem.findFirst({ where: { id, userId } });
  if (!item) {
    return NextResponse.json({ error: "Pantry item not found." }, { status: 404 });
  }
  await prisma.pantryItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
