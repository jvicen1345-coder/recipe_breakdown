// Shared shapes between the submission wizard's API routes and the client wizard/
// review/admin UIs — mirrors the toRecipeDto()-style pattern used for Recipe/Folder.
import { z } from "zod";

import { MIN_DESCRIPTION_LENGTH, MIN_INGREDIENTS, MIN_STEPS, MIN_STORY_LENGTH } from "./communityConstants";

export const submissionIngredientSchema = z.object({
  amount: z.string().trim().max(40),
  unit: z.string().trim().max(40),
  name: z.string().trim().min(1).max(200),
});

export const submissionNutritionInputSchema = z
  .object({
    caloriesPerServing: z.number().positive().nullable(),
    proteinGrams: z.number().nonnegative().nullable(),
    carbsGrams: z.number().nonnegative().nullable(),
    fatGrams: z.number().nonnegative().nullable(),
  })
  .partial()
  .nullable();

const baseSubmissionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(MIN_DESCRIPTION_LENGTH).max(1000),
  cuisineType: z.string().trim().max(60).nullable(),
  dietTags: z.array(z.string().trim().max(40)).max(10),
  cookTimeMinutes: z.number().int().positive().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable(),
  ingredients: z.array(submissionIngredientSchema).min(MIN_INGREDIENTS),
  instructions: z.array(z.string().trim().min(1).max(1000)).min(MIN_STEPS),
  story: z.string().trim().min(MIN_STORY_LENGTH).max(4000),
  photoUrl: z.string().min(1),
  photoWidth: z.number().int().positive(),
  photoHeight: z.number().int().positive(),
  nutrition: submissionNutritionInputSchema.optional(),
});

// A draft only needs a title — everything else can be filled in gradually, so every
// other field is optional and unvalidated for length until "Submit for review".
export const draftSubmissionSchema = baseSubmissionSchema.partial().extend({
  title: z.string().trim().min(1).max(200),
});

export const submitSubmissionSchema = baseSubmissionSchema;

export interface CommunitySubmissionDto {
  id: string;
  status: string;
  title: string;
  description: string;
  cuisineType: string | null;
  dietTags: string[];
  cookTimeMinutes: number | null;
  difficulty: string | null;
  ingredients: { amount: string; unit: string; name: string }[];
  instructions: string[];
  story: string;
  photoUrl: string | null;
  aiFlags: string[];
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  approvedRecipeId: string | null;
}

function safeParseArray<T>(json: string | null | undefined): T[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toCommunitySubmissionDto(submission: {
  id: string;
  status: string;
  title: string;
  description: string;
  cuisineType: string | null;
  dietTagsJson: string;
  cookTimeMinutes: number | null;
  difficulty: string | null;
  ingredientsJson: string;
  instructionsJson: string;
  story: string;
  photoUrl: string | null;
  aiFlagsJson: string;
  rejectionReason: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  approvedRecipeId: string | null;
}): CommunitySubmissionDto {
  return {
    id: submission.id,
    status: submission.status,
    title: submission.title,
    description: submission.description,
    cuisineType: submission.cuisineType,
    dietTags: safeParseArray<string>(submission.dietTagsJson),
    cookTimeMinutes: submission.cookTimeMinutes,
    difficulty: submission.difficulty,
    ingredients: safeParseArray<{ amount: string; unit: string; name: string }>(submission.ingredientsJson),
    instructions: safeParseArray<string>(submission.instructionsJson),
    story: submission.story,
    photoUrl: submission.photoUrl,
    aiFlags: safeParseArray<string>(submission.aiFlagsJson),
    rejectionReason: submission.rejectionReason,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    createdAt: submission.createdAt.toISOString(),
    approvedRecipeId: submission.approvedRecipeId,
  };
}
