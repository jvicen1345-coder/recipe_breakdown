// Plain constants shared by both the client-side submission wizard and the
// server-side validation/moderation logic in lib/community.ts — kept in their own
// file (no Prisma import) so client components can import them safely.
export const CUISINE_TYPES = [
  "American",
  "Italian",
  "Mexican",
  "Asian",
  "Mediterranean",
  "Indian",
  "French",
  "Middle Eastern",
  "Comfort Food",
  "Other",
];

export const DIET_TAG_OPTIONS = [
  "Vegan",
  "Vegetarian",
  "Pescatarian",
  "Gluten-Free",
  "Dairy-Free",
  "Low-Carb",
  "High-Protein",
  "Budget-Friendly",
];

export const MIN_INGREDIENTS = 3;
export const MIN_STEPS = 3;
export const MIN_DESCRIPTION_LENGTH = 30;
export const MIN_STORY_LENGTH = 50;
export const MIN_PHOTO_SHORTEST_SIDE = 800;

export const POINTS_PER_SUBMISSION = 5;
export const POINTS_PER_APPROVAL = 10;
export const POINTS_FOR_FREE_PRO_MONTH = 500;

export const STORY_PLACEHOLDERS = [
  "My grandma used to make this every Sunday...",
  "I swapped the cream for coconut milk because...",
  "After my third failed attempt I finally figured out...",
];
