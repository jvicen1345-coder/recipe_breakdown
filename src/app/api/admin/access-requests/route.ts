import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const requests = await prisma.accessRequest.findMany({
    where: { status: "pending" },
    orderBy: { requestedAt: "asc" },
  });

  return NextResponse.json({
    requests: requests.map((r) => ({ id: r.id, email: r.email, requestedAt: r.requestedAt.toISOString() })),
  });
}
