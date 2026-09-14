import { NextResponse } from "next/server";

import Anthropic from "@anthropic-ai/sdk";

interface RecipeSummary {
  id: string;
  title: string;
  ingredients: string[];
  dietType: string | null;
  proteinType: string | null;
  difficulty: string | null;
  totalTimeMinutes: number | null;
  priceLevel: string | null;
  estimatedPriceUsd: number | null;
  caloriesPerServing: number | null;
  daysSinceCooked: number | null;
}

const TOOL_NAME = "submit_recipe_matches";

const MATCH_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Submits which of the user's saved recipes match their search request.",
  input_schema: {
    type: "object",
    properties: {
      matchingIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Ids of recipes that genuinely match the request, ordered best match first. Empty array if nothing fits.",
      },
    },
    required: ["matchingIds"],
  },
};

const SYSTEM_PROMPT = `You are the search assistant for a personal recipe app. The user has saved a list of recipes and typed a search request that may be a plain keyword or a conversational request (e.g. "quick chicken dinner", "something with eggs I haven't made in a while", "cheap vegan thing under 30 min").

You'll receive the request and a list of the user's saved recipes with their title, ingredients, diet/protein type, difficulty, time, price, calories per serving, and how many days ago they last cooked it (or "never made" if they haven't). Return the ids of recipes that genuinely satisfy the request, best match first. Interpret intent naturally — match on ingredients, time, cost, diet, protein, or how recently it was made as the request implies. It's fine to return an empty list if nothing truly fits; don't force weak matches.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Smart search isn't configured." }, { status: 503 });
  }

  let body: { query?: unknown; recipes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  const recipes: RecipeSummary[] = Array.isArray(body.recipes) ? (body.recipes as RecipeSummary[]) : [];

  if (!query || recipes.length === 0) {
    return NextResponse.json({ matchingIds: [] });
  }

  const recipeList = recipes
    .map((r) => {
      const parts = [
        `id: ${r.id}`,
        `title: ${r.title}`,
        r.ingredients.length ? `ingredients: ${r.ingredients.join(", ")}` : null,
        r.dietType ? `diet: ${r.dietType}` : null,
        r.proteinType ? `protein: ${r.proteinType}` : null,
        r.difficulty ? `difficulty: ${r.difficulty}` : null,
        r.totalTimeMinutes != null ? `time: ${r.totalTimeMinutes} min` : null,
        r.priceLevel ? `price: ${r.priceLevel}` : null,
        r.estimatedPriceUsd != null ? `~$${r.estimatedPriceUsd}` : null,
        r.caloriesPerServing != null ? `${r.caloriesPerServing} cal/serving` : null,
        r.daysSinceCooked == null ? "never made" : `made ${r.daysSinceCooked}d ago`,
      ].filter(Boolean);
      return `- ${parts.join(" | ")}`;
    })
    .join("\n");

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_SEARCH_MODEL || "claude-haiku-4-5-20251001";

    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [MATCH_TOOL],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: `Request: "${query}"\n\nSaved recipes:\n${recipeList}`,
        },
      ],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    const input = toolUse?.input as { matchingIds?: unknown } | undefined;
    const matchingIds = Array.isArray(input?.matchingIds)
      ? input.matchingIds.filter((id): id is string => typeof id === "string")
      : [];

    return NextResponse.json({ matchingIds });
  } catch (error) {
    console.error("Smart recipe search failed:", error);
    return NextResponse.json({ error: "Smart search failed." }, { status: 502 });
  }
}
