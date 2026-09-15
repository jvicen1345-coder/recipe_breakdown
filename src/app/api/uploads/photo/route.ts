// A lenient sibling of /api/community/upload-photo for contexts that don't need the
// submission-grade screenshot/minimum-size checks (currently: the manual meal log's
// optional photo) — just "is this actually an image".
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { requireVerifiedUserId } from "@/lib/auth";
import { COMMUNITY_UPLOADS_DIR } from "@/lib/communityUploads";

export async function POST(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo was attached." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "That file isn't an image." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let jpeg: Buffer;
  try {
    jpeg = await sharp(buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  } catch {
    return NextResponse.json({ error: "Couldn't read that image — try a different photo." }, { status: 400 });
  }

  await fs.mkdir(COMMUNITY_UPLOADS_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.jpg`;
  await fs.writeFile(path.join(COMMUNITY_UPLOADS_DIR, filename), jpeg);

  return NextResponse.json({ url: `/api/community-media/${filename}` });
}
