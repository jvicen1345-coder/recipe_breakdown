import path from "node:path";

import sharp from "sharp";

import { runCommand } from "./exec";

const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_BIN = process.env.FFPROBE_PATH || "ffprobe";
const TOOL_TIMEOUT_MS = 60_000;

export async function probeDurationSeconds(videoPath: string): Promise<number | null> {
  try {
    const { stdout } = await runCommand(
      FFPROBE_BIN,
      ["-v", "error", "-show_entries", "format=duration", "-of", "json", videoPath],
      { timeoutMs: TOOL_TIMEOUT_MS },
    );
    const parsed = JSON.parse(stdout);
    const duration = Number(parsed?.format?.duration);
    return Number.isFinite(duration) ? duration : null;
  } catch {
    return null;
  }
}

/** Extracts a mono 16kHz WAV track, suitable for speech-to-text. */
export async function extractAudio(videoPath: string, outDir: string): Promise<string> {
  const audioPath = path.join(outDir, "audio.wav");
  await runCommand(
    FFMPEG_BIN,
    ["-y", "-i", videoPath, "-vn", "-ac", "1", "-ar", "16000", audioPath],
    { timeoutMs: TOOL_TIMEOUT_MS },
  );
  return audioPath;
}

/** Grabs `count` evenly-spaced JPEG frames (skipping the very start/end) for visual/OCR context. */
export async function extractFrames(
  videoPath: string,
  outDir: string,
  opts?: { count?: number; width?: number },
): Promise<string[]> {
  const count = opts?.count ?? 5;
  const width = opts?.width ?? 720;
  const duration = (await probeDurationSeconds(videoPath)) ?? 15;

  const margin = duration * 0.08;
  const usableSpan = Math.max(duration - margin * 2, 0.1);
  const timestamps = Array.from({ length: count }, (_, i) =>
    margin + (usableSpan * (i + 0.5)) / count,
  );

  const frames: string[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const framePath = path.join(outDir, `frame-${i}.jpg`);
    await runCommand(
      FFMPEG_BIN,
      [
        "-y",
        "-ss",
        timestamps[i].toFixed(2),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-vf",
        `scale=${width}:-1`,
        "-q:v",
        "3",
        framePath,
      ],
      { timeoutMs: TOOL_TIMEOUT_MS },
    );
    frames.push(framePath);
  }
  return frames;
}

const LAPLACIAN_KERNEL = { width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] };

/** Variance of a Laplacian edge response — low values mean a flat/motion-blurred frame. */
async function frameSharpness(framePath: string): Promise<number> {
  const { channels } = await sharp(framePath).greyscale().convolve(LAPLACIAN_KERNEL).stats();
  return channels[0].stdev ** 2;
}

/**
 * Picks the least blurry of the extracted frames to use as a thumbnail. Frames are sampled
 * at fixed timestamps regardless of what's happening in the video, so the "middle" one can
 * easily land mid-zoom or mid-pan, producing a motion-blurred thumbnail.
 */
export async function pickSharpestFrame(framePaths: string[]): Promise<string> {
  const scored = await Promise.all(
    framePaths.map(async (framePath) => ({
      framePath,
      score: await frameSharpness(framePath).catch(() => -1),
    })),
  );
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
  return best.score >= 0 ? best.framePath : framePaths[Math.floor(framePaths.length / 2)];
}
