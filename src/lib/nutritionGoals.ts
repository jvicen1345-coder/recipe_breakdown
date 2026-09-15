// Soft daily macro goals, adjustable per-account from the Week tab's "Adjust my
// goals" sheet. Unset fields fall back to these defaults rather than every account
// needing a row written on signup.
export const DEFAULT_GOALS = { calories: 2000, protein: 120, carbs: 250, fat: 65 };

export const GOAL_RANGES = {
  calories: { min: 1200, max: 4000, step: 50 },
  protein: { min: 40, max: 300, step: 5 },
  carbs: { min: 50, max: 500, step: 5 },
  fat: { min: 20, max: 150, step: 5 },
};

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function resolveGoals(user: {
  goalCalories: number | null;
  goalProtein: number | null;
  goalCarbs: number | null;
  goalFat: number | null;
}): MacroGoals {
  return {
    calories: user.goalCalories ?? DEFAULT_GOALS.calories,
    protein: user.goalProtein ?? DEFAULT_GOALS.protein,
    carbs: user.goalCarbs ?? DEFAULT_GOALS.carbs,
    fat: user.goalFat ?? DEFAULT_GOALS.fat,
  };
}

export function clampGoal(key: keyof typeof GOAL_RANGES, value: number): number {
  const { min, max } = GOAL_RANGES[key];
  return Math.round(Math.max(min, Math.min(max, value)));
}
