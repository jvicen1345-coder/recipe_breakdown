import { NextResponse } from "next/server";

import { runCommand } from "@/lib/exec";

// Used by Render's healthcheck to confirm a new deploy is actually serving
// requests before it takes over traffic from the previous one. Plain GET
// stays cheap for that frequent polling; ?diagnostics=true additionally
// reports whether yt-dlp/ffmpeg/ffprobe are actually detected at runtime —
// useful for diagnosing pipeline issues without shell access.
async function checkTool(bin: string, versionFlag: string, timeoutMs = 5000) {
  try {
    const { stdout } = await runCommand(bin, [versionFlag], { timeoutMs });
    return { available: true, bin, version: stdout.trim().split("\n")[0] };
  } catch (err) {
    return { available: false, bin, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET(request: Request) {
  const wantsDiagnostics = new URL(request.url).searchParams.has("diagnostics");
  if (!wantsDiagnostics) {
    return NextResponse.json({ status: "ok" });
  }

  // yt-dlp's standalone binary self-extracts on its first run, which can take
  // noticeably longer than ffmpeg/ffprobe's plain `-version` check — give it
  // more headroom rather than reporting a false negative.
  const [ytDlp, ffmpeg, ffprobe] = await Promise.all([
    checkTool(process.env.YT_DLP_PATH || "yt-dlp", "--version", 15_000),
    checkTool(process.env.FFMPEG_PATH || "ffmpeg", "-version"),
    checkTool(process.env.FFPROBE_PATH || "ffprobe", "-version"),
  ]);

  return NextResponse.json({
    status: "ok",
    path: process.env.PATH,
    tools: { ytDlp, ffmpeg, ffprobe },
  });
}
