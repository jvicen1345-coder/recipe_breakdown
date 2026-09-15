// Everything behind the community recipe submission + points system: trust levels,
// the points economy, and the Layer 1 heuristic pre-screening. Layers 2 (community
// vote) and 3 (admin approval) live in their own API routes since they're mostly
// straight Prisma reads/writes, but the scoring rules they act on live here too.
import { prisma } from "./prisma";

export {
  CUISINE_TYPES,
  DIET_TAG_OPTIONS,
  MIN_INGREDIENTS,
  MIN_STEPS,
  MIN_DESCRIPTION_LENGTH,
  MIN_STORY_LENGTH,
  MIN_PHOTO_SHORTEST_SIDE,
  POINTS_PER_SUBMISSION,
  POINTS_PER_APPROVAL,
  POINTS_FOR_FREE_PRO_MONTH,
} from "./communityConstants";
import { POINTS_FOR_FREE_PRO_MONTH } from "./communityConstants";

export type TrustLevel = "new" | "trusted" | "flagged";

export interface TrustInfo {
  level: TrustLevel;
  approvedCount: number;
  rejectedCount: number;
  weeklySubmissionLimit: number;
  badge: string | null;
}

/** New (0-4 approved): 2/week. Trusted (5+ approved): 5/week + badge. Flagged (3+ rejected): 1/week. */
export async function getTrustInfo(userId: string): Promise<TrustInfo> {
  const [approvedCount, rejectedCount] = await Promise.all([
    prisma.communitySubmission.count({ where: { submittedByUserId: userId, status: "approved" } }),
    prisma.communitySubmission.count({
      where: { submittedByUserId: userId, status: { in: ["rejected", "auto_rejected"] } },
    }),
  ]);

  if (rejectedCount >= 3) {
    return { level: "flagged", approvedCount, rejectedCount, weeklySubmissionLimit: 1, badge: null };
  }
  if (approvedCount >= 5) {
    return { level: "trusted", approvedCount, rejectedCount, weeklySubmissionLimit: 5, badge: "Trusted Chef 👩‍🍳" };
  }
  return { level: "new", approvedCount, rejectedCount, weeklySubmissionLimit: 2, badge: null };
}

export async function countSubmissionsThisWeek(userId: string): Promise<number> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  return prisma.communitySubmission.count({
    where: { submittedByUserId: userId, submittedAt: { gte: weekAgo } },
  });
}

/** Adds points and, once 500+ are banked, silently converts them into granted Pro time. */
export async function awardPoints(userId: string, amount: number): Promise<number> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: amount } },
  });
  return redeemFreeProIfEligible(userId, updated.points);
}

async function redeemFreeProIfEligible(userId: string, currentPoints: number): Promise<number> {
  const monthsEarned = Math.floor(currentPoints / POINTS_FOR_FREE_PRO_MONTH);
  if (monthsEarned < 1) return currentPoints;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { proAccessUntil: true } });
  if (!user) return currentPoints;

  const base = user.proAccessUntil && user.proAccessUntil.getTime() > Date.now() ? user.proAccessUntil : new Date();
  const extended = new Date(base);
  extended.setDate(extended.getDate() + 30 * monthsEarned);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      points: { decrement: monthsEarned * POINTS_FOR_FREE_PRO_MONTH },
      proAccessUntil: extended,
    },
  });
  return updated.points;
}

// --- Layer 1: AI (heuristic) pre-screening ---

const GENERIC_ORIGIN_PHRASES = [
  "found this online",
  "found it online",
  "from tiktok",
  "saw this on tiktok",
  "saw it on tiktok",
  "from instagram",
  "from pinterest",
  "from youtube",
  "copied from",
  "not my recipe",
  "got this recipe from a website",
  "random recipe i found",
];

function normalizeForComparison(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface ScreeningInput {
  submittedByUserId: string;
  story: string;
  ingredients: { amount: string; unit: string; name: string }[];
  instructions: string[];
  photoFlaggedScreenshot: boolean;
}

/**
 * Heuristic Layer 1 checks — no model call, just the rules described in the spec:
 * generic "found this online"-style phrasing, near-duplicate ingredients/steps
 * against existing recipes and other submissions, a flagged-as-screenshot photo,
 * and suspiciously rapid submitting. Returns a list of human-readable flags; an
 * empty list means it sailed through clean.
 */
export async function runAiPreScreening(input: ScreeningInput): Promise<string[]> {
  const flags: string[] = [];
  const storyLower = input.story.toLowerCase();

  if (GENERIC_ORIGIN_PHRASES.some((phrase) => storyLower.includes(phrase))) {
    flags.push("Story reads like it names an outside source rather than a personal origin");
  }

  if (input.photoFlaggedScreenshot) {
    flags.push("Photo looks like it might be a phone screenshot rather than a kitchen photo");
  }

  const submissionText = [
    ...input.ingredients.map((i) => `${i.amount} ${i.unit} ${i.name}`),
    ...input.instructions,
  ].join(" ");
  const submissionWords = normalizeForComparison(submissionText);

  if (submissionWords.size > 0) {
    const [recentRecipes, recentSubmissions] = await Promise.all([
      prisma.recipe.findMany({
        select: { ingredientsJson: true, instructionsJson: true },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      prisma.communitySubmission.findMany({
        where: { submittedByUserId: { not: input.submittedByUserId }, status: { not: "draft" } },
        select: { ingredientsJson: true, instructionsJson: true },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
    ]);

    const candidates = [...recentRecipes, ...recentSubmissions];
    for (const candidate of candidates) {
      let candidateIngredients: unknown;
      let candidateInstructions: unknown;
      try {
        candidateIngredients = JSON.parse(candidate.ingredientsJson);
        candidateInstructions = JSON.parse(candidate.instructionsJson);
      } catch {
        continue;
      }
      const candidateText = [
        ...(Array.isArray(candidateIngredients) ? candidateIngredients : []).map((i) =>
          typeof i === "object" && i ? Object.values(i).join(" ") : String(i),
        ),
        ...(Array.isArray(candidateInstructions) ? candidateInstructions : []).map(String),
      ].join(" ");
      const candidateWords = normalizeForComparison(candidateText);
      if (jaccardSimilarity(submissionWords, candidateWords) > 0.8) {
        flags.push("Ingredients and steps are a very close match to an existing recipe");
        break;
      }
    }
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
  const recentSubmissionCount = await prisma.communitySubmission.count({
    where: { submittedByUserId: input.submittedByUserId, createdAt: { gte: fiveMinutesAgo } },
  });
  if (recentSubmissionCount >= 2) {
    flags.push("Multiple submissions in a very short window");
  }

  return flags;
}

// --- Layer 2: community vote tally ---

export type VoteTally = "advance" | "auto_reject" | "manual_review";

export function tallyVotes(votes: { vote: string }[]): VoteTally | null {
  if (votes.length < 3) return null;
  const yes = votes.filter((v) => v.vote === "yes").length;
  const no = votes.filter((v) => v.vote === "no").length;
  if (yes > no) return "advance";
  if (no > yes) return "auto_reject";
  return "manual_review";
}
