import { NextResponse } from "next/server";

import { commandExists } from "@/lib/exec";

// Used by Railway/Render's healthcheck to confirm a new deploy is actually
// serving requests before it takes over traffic from the previous one. Plain
// GET stays cheap for that frequent polling; ?diagnostics=true additionally
// reports whether the full-pipeline binaries are actually detected at
// runtime — useful for diagnosing "Import a Collection" being hidden on a
// host that's supposed to have yt-dlp, without needing shell access.
export async function GET(request: Request) {
  const wantsDiagnostics = new URL(request.url).searchParams.has("diagnostics");
  if (!wantsDiagnostics) {
    return NextResponse.json({ status: "ok" });
  }

  const ytDlpBin = process.env.YT_DLP_PATH || "yt-dlp";
  const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";
  const ffprobeBin = process.env.FFPROBE_PATH || "ffprobe";

  const [ytDlp, ffmpeg, ffprobe] = await Promise.all([
    commandExists(ytDlpBin),
    commandExists(ffmpegBin),
    commandExists(ffprobeBin),
  ]);

  return NextResponse.json({
    status: "ok",
    tools: {
      ytDlp: { available: ytDlp, bin: ytDlpBin },
      ffmpeg: { available: ffmpeg, bin: ffmpegBin },
      ffprobe: { available: ffprobe, bin: ffprobeBin },
    },
  });
}
