"use client";

import { useState } from "react";

import { BottomSheet } from "./BottomSheet";
import { useToast } from "./ToastProvider";
import { GOAL_RANGES, type MacroGoals } from "@/lib/nutritionGoals";

const SLIDERS: { key: keyof MacroGoals; label: string; emoji: string; unit: string; accent: string; track: string }[] = [
  { key: "calories", label: "Calories", emoji: "🔥", unit: "", accent: "accent-coral", track: "bg-coral/20" },
  { key: "protein", label: "Protein", emoji: "💪", unit: "g", accent: "accent-lavender-dark", track: "bg-lavender/30" },
  { key: "carbs", label: "Carbs", emoji: "🍞", unit: "g", accent: "accent-peach-dark", track: "bg-peach/30" },
  { key: "fat", label: "Fat", emoji: "🥑", unit: "g", accent: "accent-sky-400", track: "bg-sky-100" },
];

export function AdjustGoalsSheet({
  initialGoals,
  onClose,
  onSaved,
}: {
  initialGoals: MacroGoals;
  onClose: () => void;
  onSaved: (goals: MacroGoals) => void;
}) {
  const [goals, setGoals] = useState<MacroGoals>(initialGoals);
  const [saving, setSaving] = useState(false);
  const showToast = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/nutrition-goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals),
      });
      if (!res.ok) throw new Error();
      onSaved(goals);
      showToast("Goals saved 🌸");
      onClose();
    } catch {
      showToast("Couldn't save that — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="mb-4 font-serif text-lg font-semibold text-rose-deep">Adjust my goals 🎀</h2>
      <div className="flex flex-col gap-5">
        {SLIDERS.map((slider) => {
          const range = GOAL_RANGES[slider.key];
          const value = goals[slider.key];
          return (
            <div key={slider.key} className={`flex flex-col gap-2 rounded-2xl p-3 ${slider.track}`}>
              <div className="flex items-center justify-between text-sm font-semibold text-rose-deep">
                <span>
                  {slider.emoji} {slider.label}
                </span>
                <span>
                  {value}
                  {slider.unit}
                </span>
              </div>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={value}
                onChange={(e) => setGoals((prev) => ({ ...prev, [slider.key]: Number(e.target.value) }))}
                className={`h-2 w-full cursor-pointer rounded-full ${slider.accent}`}
              />
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save goals 🌸"}
        </button>
        <p className="text-center text-xs text-dusty-rose">These are soft goals, not rules 🎀</p>
      </div>
    </BottomSheet>
  );
}
