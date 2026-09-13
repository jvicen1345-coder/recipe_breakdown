import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { toFolderDto } from "@/lib/types";

const createFolderSchema = z.object({
  name: z.string().trim().min(1, "A folder name is required.").max(60),
  emoji: z.string().trim().max(8).optional(),
});

export async function GET() {
  const folders = await prisma.folder.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ folders: folders.map(toFolderDto) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const folder = await prisma.folder.create({
    data: { name: parsed.data.name, emoji: parsed.data.emoji || null },
  });
  return NextResponse.json({ folder: toFolderDto(folder) }, { status: 201 });
}
