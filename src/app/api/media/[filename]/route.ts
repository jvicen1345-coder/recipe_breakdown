import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { UPLOADS_DIR } from "@/lib/pipeline";

interface Params {
  params: Promise<{ filename: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { filename } = await params;

  // Reject anything that isn't a plain filename (no path traversal).
  if (filename !== path.basename(filename) || !/^[\w-]+\.jpg$/.test(filename)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const data = await fs.readFile(path.join(UPLOADS_DIR, filename));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
