// Estimates nutrition for an approved community submission that didn't fill in the
// optional macros itself — same Anthropic tool-calling pattern as analyzeRecipe(),
// just text-only (ingredients/steps, no video frames) and scoped to one small object.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const submissionNutritionSchema = z.object({
  caloriesPerServing: z.number().positive().nullable(),
  proteinGrams: z.number().nonnegative().nullable(),
  carbsGrams: z.number().nonnegative().nullable(),
  fatGrams: z.number().nonnegative().nullable(),
  fiberGrams: z.number().nonnegative().nullable(),
  sugarGrams: z.number().nonnegative().nullable(),
  sodiumMg: z.number().nonnegative().nullable(),
});

export type SubmissionNutrition = z.infer<typeof submissionNutritionSchema>;

const TOOL_NAME = "submit_nutrition_estimate";

const NUTRITION_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Submits an estimated per-serving nutrition breakdown for a home-cooked recipe.",
  input_schema: {
    type: "object",
    properties: {
      caloriesPerServing: { type: ["number", "null"] },
      proteinGrams: { type: ["number", "null"] },
      carbsGrams: { type: ["number", "null"] },
      fatGrams: { type: ["number", "null"] },
      fiberGrams: { type: ["number", "null"] },
      sugarGrams: { type: ["number", "null"] },
      sodiumMg: { type: ["number", "null"], description: "Sodium in milligrams." },
    },
    required: ["caloriesPerServing", "proteinGrams", "carbsGrams", "fatGrams", "fiberGrams", "sugarGrams", "sodiumMg"],
  },
};

const SYSTEM_PROMPT = `You are a nutrition estimator for a home-cooking recipe app. Given a recipe's ingredients and steps, estimate nutrition facts for a single serving: calories, protein, carbs, fat, fiber, sugar (all in grams except calories), and sodium (in milligrams). Base this on standard nutritional values for the ingredients and quantities involved. Only use null for a field if the dish genuinely has none of it. Always respond by calling the submit_nutrition_estimate tool exactly once, with no other text.`;

export async function estimateSubmissionNutrition(input: {
  title: string;
  servings: number | null;
  ingredients: { amount: string; unit: string; name: string }[];
  instructions: string[];
}): Promise<SubmissionNutrition | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const text = [
    `Recipe: ${input.title}`,
    input.servings ? `Servings: ${input.servings}` : null,
    `Ingredients:\n${input.ingredients.map((i) => `- ${i.amount} ${i.unit} ${i.name}`.trim()).join("\n")}`,
    `Steps:\n${input.instructions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      tools: [NUTRITION_TOOL],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [{ role: "user", content: text }],
    });

    const toolUse = message.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) return null;

    const parsed = submissionNutritionSchema.safeParse(toolUse.input);
    return parsed.success ? parsed.data : null;
  } catch {
    // Nutrition estimation is a nice-to-have on approval, not a blocker — an approved
    // recipe with no nutrition data just won't show up in macro-based recommendations.
    return null;
  }
}
