// Plain constants for the "Made It" share flow — kept prisma-free so the client-side
// MadeItFlow/community feed components can import them directly.
export const MAX_CAPTION_LENGTH = 150;

// Starting points for the editable TikTok comment box — the user can freely rewrite
// these, and nothing here is tied to a points reward (see MadeItFlow).
export const TIKTOK_COMMENT_STARTERS = [
  "Made this tonight and it was actually so good 😭",
  "Finally tried this!! obsessed 🌸",
  "Been saving this for weeks, finally made it and WOW",
  "Ok I actually made this and I'm in love 😍",
  "This one lives in my head rent free, had to try it",
  "Made this for dinner and everyone lost their minds 🌸",
  "Cannot believe how good this turned out 😭🌸",
  "This is going into the permanent rotation no questions asked",
];

export const CUTESY_EATS_TAG = "@CutesyEats";

export const POINTS_PER_MADE_IT_POST = 1;
// A post's poster earns at most this many points from hearts, total — prevents gaming.
export const HEART_POINT_CAP = 10;
// Reports needed before a post is auto-hidden from the public feed.
export const REPORT_HIDE_THRESHOLD = 3;
