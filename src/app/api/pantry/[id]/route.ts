import { NextResponse } from "next/server";

import { requireVerifiedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const item = await prisma.pantryItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Pantry item not found." }, { status: 404 });
  }
  await prisma.pantryItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
