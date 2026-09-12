import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runCommand } from "./exec";

const YT_DLP_BIN = process.env.YT_DLP_PATH || "yt-dlp";
const DOWNLOAD_TIMEOUT_MS = 120_000;

export class InvalidTikTokUrlError extends Error {}

export interface TikTokMetadata {
  id: string;
  title: string;
  description: string;
  uploader: string | null;
  durationSeconds: number | null;
  webpageUrl: string;
}

export interface TikTokDownload {
  metadata: TikTokMetadata;
  videoPath: string;
  workDir: string;
}

/** Accepts full tiktok.com links as well as short vm.tiktok.com / vt.tiktok.com share links. */
export function isTikTokUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return /(^|\.)tiktok\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function assertTikTokUrl(url: string) {
  if (!isTikTokUrl(url)) {
    throw new InvalidTikTokUrlError("That doesn't look like a TikTok link (expected a tiktok.com URL).");
  }
}

/**
 * Downloads a TikTok video + metadata into a fresh scratch directory using yt-dlp.
 * Caller is responsible for deleting `workDir` once done with the files.
 */
export async function downloadTikTok(url: string): Promise<TikTokDownload> {
  assertTikTokUrl(url);

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "recipe-breakdown-"));
  const outputTemplate = path.join(workDir, "video.%(ext)s");

  try {
    await runCommand(
      YT_DLP_BIN,
      [
        url,
        "--no-playlist",
        "--no-warnings",
        "--write-info-json",
        "--max-filesize",
        "300M",
        "--socket-timeout",
        "30",
        "-f",
        "mp4/best",
        "-o",
        outputTemplate,
      ],
      { timeoutMs: DOWNLOAD_TIMEOUT_MS },
    );
  } catch (err) {
    await fs.rm(workDir, { recursive: true, force: true });
    throw err;
  }

  const entries = await fs.readdir(workDir);
  const infoJsonName = entries.find((f) => f.endsWith(".info.json"));
  const videoName = entries.find((f) => f.startsWith("video.") && !f.endsWith(".info.json"));

  if (!infoJsonName || !videoName) {
    await fs.rm(workDir, { recursive: true, force: true });
    throw new Error("yt-dlp did not produce the expected video/metadata files.");
  }

  const raw = JSON.parse(await fs.readFile(path.join(workDir, infoJsonName), "utf-8"));

  const metadata: TikTokMetadata = {
    id: String(raw.id ?? randomUUID()),
    title: raw.title ?? "",
    description: raw.description ?? raw.title ?? "",
    uploader: raw.uploader ?? raw.uploader_id ?? raw.creator ?? null,
    durationSeconds: typeof raw.duration === "number" ? Math.round(raw.duration) : null,
    webpageUrl: raw.webpage_url ?? url,
  };

  return { metadata, videoPath: path.join(workDir, videoName), workDir };
}

export async function cleanupWorkDir(workDir: string): Promise<void> {
  await fs.rm(workDir, { recursive: true, force: true });
}
