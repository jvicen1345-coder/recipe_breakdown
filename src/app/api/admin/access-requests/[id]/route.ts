import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(_request: Request, { params }: Params) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.accessRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const updated = await prisma.accessRequest.update({ where: { id }, data: { status: "approved" } });
  return NextResponse.json({ request: { id: updated.id, email: updated.email, status: updated.status } });
}
