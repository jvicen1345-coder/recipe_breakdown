import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/lib/auth";
import { fetchTikTokCollection } from "@/lib/collection";
import { ExternalToolError } from "@/lib/exec";
import { toUserFacingPipelineError } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { InvalidTikTokUrlError } from "@/lib/tiktok";

export const maxDuration = 60;

const schema = z.object({ url: z.string().trim().min(1, "A TikTok collection link is required.") });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  try {
    const collection = await fetchTikTokCollection(parsed.data.url);
    if (collection.entries.length === 0) {
      return NextResponse.json({ error: "No videos found in that collection." }, { status: 404 });
    }
    return NextResponse.json({ collection });
  } catch (err) {
    if (err instanceof InvalidTikTokUrlError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const userId = await getSessionUserId();
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

    if (err instanceof ExternalToolError) {
      console.error("[api/collections/preview] failed:", err);
      return NextResponse.json(
        {
          error: toUserFacingPipelineError(
            `Couldn't read that collection (${err.tool}): ${err.message}`,
            user?.email ?? "",
          ),
        },
        { status: 502 },
      );
    }
    console.error("[api/collections/preview] failed:", err);
    const rawMessage = err instanceof Error ? err.message : "Failed to read that collection.";
    return NextResponse.json({ error: toUserFacingPipelineError(rawMessage, user?.email ?? "") }, { status: 500 });
  }
}
