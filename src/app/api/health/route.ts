import { NextResponse } from "next/server";

import { runCommand } from "@/lib/exec";
import { isFullPipelineAvailable } from "@/lib/pipeline";

// Used by Railway/Render's healthcheck to confirm a new deploy is actually
// serving requests before it takes over traffic from the previous one. Plain
// GET stays cheap for that frequent polling; ?diagnostics=true additionally
// reports whether the full-pipeline binaries are actually detected at
// runtime — useful for diagnosing "Import a Collection" being hidden on a
// host that's supposed to have yt-dlp, without needing shell access.
async function checkTool(bin: string, versionFlag: string) {
  try {
    const { stdout } = await runCommand(bin, [versionFlag], { timeoutMs: 5000 });
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

  // yt-dlp reports the app's actual (cached) view, since that's what really
  // gates the Collection-import UI — ffmpeg/ffprobe aren't cached anywhere
  // else, so those get their own one-off check (note: ffmpeg's CLI uses a
  // single-dash `-version`, not the GNU-style `--version`).
  const [ytDlpAvailable, ffmpeg, ffprobe] = await Promise.all([
    isFullPipelineAvailable(),
    checkTool(process.env.FFMPEG_PATH || "ffmpeg", "-version"),
    checkTool(process.env.FFPROBE_PATH || "ffprobe", "-version"),
  ]);

  return NextResponse.json({
    status: "ok",
    path: process.env.PATH,
    tools: {
      ytDlp: { available: ytDlpAvailable, bin: process.env.YT_DLP_PATH || "yt-dlp" },
      ffmpeg,
      ffprobe,
    },
  });
}
