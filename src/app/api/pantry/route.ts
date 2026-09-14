import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId, requireVerifiedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPantryItemDto } from "@/lib/types";

const createPantryItemSchema = z.object({
  name: z.string().trim().min(1, "An ingredient name is required.").max(60),
  category: z.string().trim().min(1).max(40),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const items = await prisma.pantryItem.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ items: items.map(toPantryItemDto) });
}

export async function POST(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = createPantryItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const existing = await prisma.pantryItem.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json({ item: toPantryItemDto(existing) }, { status: 200 });
  }

  const item = await prisma.pantryItem.create({
    data: { name: parsed.data.name, category: parsed.data.category },
  });
  return NextResponse.json({ item: toPantryItemDto(item) }, { status: 201 });
}
