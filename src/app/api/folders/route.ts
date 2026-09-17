import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId, requireVerifiedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FREE_FOLDER_LIMIT, isPro } from "@/lib/plan";
import { toFolderDto } from "@/lib/types";

const createFolderSchema = z.object({
  name: z.string().trim().min(1, "A folder name is required.").max(60),
  emoji: z.string().trim().max(8).optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const folders = await prisma.folder.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ folders: folders.map(toFolderDto) });
}

export async function POST(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = createFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!isPro(user)) {
    const folderCount = await prisma.folder.count({ where: { userId: user.id } });
    if (folderCount >= FREE_FOLDER_LIMIT) {
      return NextResponse.json(
        { error: "You've hit the free plan's 2-folder limit.", reason: "folder-limit" },
        { status: 402 },
      );
    }
  }

  const folder = await prisma.folder.create({
    data: { name: parsed.data.name, emoji: parsed.data.emoji || null, userId: user.id },
  });
  return NextResponse.json({ folder: toFolderDto(folder) }, { status: 201 });
}
