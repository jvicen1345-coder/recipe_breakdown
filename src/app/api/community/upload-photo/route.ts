import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { requireVerifiedUserId } from "@/lib/auth";
import { COMMUNITY_UPLOADS_DIR, looksLikeScreenshot } from "@/lib/communityUploads";
import { MIN_PHOTO_SHORTEST_SIDE } from "@/lib/community";

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
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return NextResponse.json({ error: "Couldn't read that image — try a different photo." }, { status: 400 });
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const shortestSide = Math.min(width, height);

  if (shortestSide < MIN_PHOTO_SHORTEST_SIDE) {
    return NextResponse.json(
      { error: "That photo is too small — please use one at least 800px on its shortest side.", code: "too_small" },
      { status: 400 },
    );
  }

  if (looksLikeScreenshot(width, height)) {
    return NextResponse.json(
      { error: "That looks like a screenshot — please add a real photo from your kitchen 📸", code: "screenshot" },
      { status: 400 },
    );
  }

  await fs.mkdir(COMMUNITY_UPLOADS_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.jpg`;
  const jpeg = await sharp(buffer).rotate().jpeg({ quality: 88 }).toBuffer();
  await fs.writeFile(path.join(COMMUNITY_UPLOADS_DIR, filename), jpeg);

  return NextResponse.json({
    url: `/api/community-media/${filename}`,
    width,
    height,
  });
}
