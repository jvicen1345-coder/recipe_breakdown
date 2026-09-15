import path from "node:path";

export const COMMUNITY_UPLOADS_DIR = path.join(process.cwd(), "data", "community-uploads");

// Exact pixel dimensions of common iOS/Android device screens — an uploaded photo
// exactly matching one of these (in either orientation) is almost certainly a
// screenshot rather than a kitchen photo. This is a resolution heuristic, not real
// on-image UI-element detection (that would need actual computer vision), but it
// catches the overwhelming majority of screenshots since device resolutions are a
// small, well-known set.
const KNOWN_SCREEN_RESOLUTIONS: [number, number][] = [
  [1170, 2532],
  [1179, 2556],
  [1080, 2340],
  [1125, 2436],
  [828, 1792],
  [750, 1334],
  [640, 1136],
  [1242, 2688],
  [1284, 2778],
  [1206, 2622],
  [1290, 2796],
  [1080, 1920],
  [1080, 2160],
  [1080, 2280],
  [1080, 2400],
  [1440, 2960],
  [1440, 3040],
  [720, 1280],
];

// Aspect ratios (tall side / short side) typical of phone screens — a photo this
// narrow-and-tall, taken with an unusual crop, is worth flagging even off an exact
// resolution match.
const SCREEN_ASPECT_RATIOS = [19.5 / 9, 20 / 9, 18 / 9, 16 / 9];
const ASPECT_TOLERANCE = 0.02;

export function looksLikeScreenshot(width: number, height: number): boolean {
  const w = Math.min(width, height);
  const h = Math.max(width, height);

  for (const [rw, rh] of KNOWN_SCREEN_RESOLUTIONS) {
    if ((w === rw && h === rh) || (w === rh && h === rw)) return true;
  }

  const ratio = h / w;
  return SCREEN_ASPECT_RATIOS.some((known) => Math.abs(ratio - known) < ASPECT_TOLERANCE);
}
