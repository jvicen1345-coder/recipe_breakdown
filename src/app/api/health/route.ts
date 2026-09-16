import { NextResponse } from "next/server";

import { runCommand } from "@/lib/exec";

// Used by Railway/Render's healthcheck to confirm a new deploy is actually
// serving requests before it takes over traffic from the previous one. Plain
// GET stays cheap for that frequent polling; ?diagnostics=true additionally
// reports whether the full-pipeline binaries are actually detected at
// runtime — useful for diagnosing "Import a Collection" being hidden on a
// host that's supposed to have yt-dlp, without needing shell access.
async function checkTool(bin: string) {
  try {
    const { stdout } = await runCommand(bin, ["--version"], { timeoutMs: 5000 });
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

  const [ytDlp, ffmpeg, ffprobe] = await Promise.all([
    checkTool(process.env.YT_DLP_PATH || "yt-dlp"),
    checkTool(process.env.FFMPEG_PATH || "ffmpeg"),
    checkTool(process.env.FFPROBE_PATH || "ffprobe"),
  ]);

  return NextResponse.json({
    status: "ok",
    path: process.env.PATH,
    tools: { ytDlp, ffmpeg, ffprobe },
  });
}
