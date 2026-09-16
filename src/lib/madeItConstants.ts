// Plain constants for the "Made It" share flow — kept prisma-free so the client-side
// MadeItFlow/community feed components can import them directly.
export const MAX_CAPTION_LENGTH = 150;

export const POINTS_PER_MADE_IT_POST = 1;
// A post's poster earns at most this many points from hearts, total — prevents gaming.
export const HEART_POINT_CAP = 10;
// Reports needed before a post is auto-hidden from the public feed.
export const REPORT_HIDE_THRESHOLD = 3;
