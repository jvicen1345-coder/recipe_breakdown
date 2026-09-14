import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const item = await prisma.pantryItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Pantry item not found." }, { status: 404 });
  }
  await prisma.pantryItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
