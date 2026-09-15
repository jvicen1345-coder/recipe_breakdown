"use client";

import { useEffect, useMemo, useState } from "react";
import { ChefHat, Clock3, CookingPot, DollarSign, ExternalLink, Flame, Minus, Plus, Utensils } from "lucide-react";

import { Badge } from "./Badge";
import { ConfettiBurst } from "./ConfettiBurst";
import { CookMode } from "./CookMode";
import { DeleteRecipeButton } from "./DeleteRecipeButton";
import { usePantry } from "./PantryProvider";
import { usePlan } from "./PlanProvider";
import { ProLockBadge } from "./ProLockBadge";
import { useProUpsell } from "./ProUpsellProvider";
import { RecipeChecklist } from "./RecipeChecklist";
import { ShopThisRecipeSection } from "./ShopThisRecipeSection";
import { useToast } from "./ToastProvider";
import { isMarkedCooked, markCooked } from "@/lib/clientState";
import { getCookModeProgress } from "@/lib/cookModeStorage";
import { pantryMatchCount } from "@/lib/pantryMatch";
import {
  DIET_LABELS,
  DIET_STYLES,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_STYLES,
  PRICE_LABELS,
  PRICE_STYLES,
  PROTEIN_LABELS,
  TIME_BADGE_STYLE,
  formatMinutes,
  formatPriceUsd,
} from "@/lib/format";
import { scaleQuantity } from "@/lib/scaling";
import type { FolderDto, Nutrition, RecipeDto } from "@/lib/types";

const NUTRITION_FIELDS: { key: keyof Nutrition; label: string; unit: string }[] = [
  { key: "caloriesPerServing", label: "Calories", unit: "" },
  { key: "proteinGrams", label: "Protein", unit: "g" },
  { key: "carbsGrams", label: "Carbs", unit: "g" },
  { key: "fatGrams", label: "Fat", unit: "g" },
  { key: "fiberGrams", label: "Fiber", unit: "g" },
  { key: "sugarGrams", label: "Sugar", unit: "g" },
  { key: "sodiumMg", label: "Sodium", unit: "mg" },
];

export function RecipeDetailContent({
  recipe,
  onClose,
}: {
  recipe: RecipeDto;
  /** Present only in the modal — lets Delete close the modal instead of redirecting home. */
  onClose?: () => void;
}) {
  const showToast = useToast();
  const price = formatPriceUsd(recipe.estimatedPriceUsd);
  const baseServings = recipe.servings ?? 1;

  const [servings, setServings] = useState(baseServings);
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [folderId, setFolderId] = useState(recipe.folderId ?? "");
  const [notes, setNotes] = useState(recipe.personalNotes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [cooked, setCooked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCookMode, setShowCookMode] = useState(false);
  const [resumeStep, setResumeStep] = useState<number | null>(null);
  const { names: pantryNames, loading: pantryLoading } = usePantry();
  const pantryCount = pantryMatchCount(recipe.ingredients, pantryNames);
  const { isPro, pantryOnboardedAt, stalenessLevel } = usePlan();
  const pantryStale = Boolean(pantryOnboardedAt) && (stalenessLevel === "banner" || stalenessLevel === "block");
  const openUpsell = useProUpsell();

  function handleCookModeClick() {
    if (!isPro) {
      openUpsell("cook-mode");
      return;
    }
    setShowCookMode(true);
  }

  useEffect(() => {
    if (showCookMode) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage, unavailable during SSR
    setResumeStep(getCookModeProgress(recipe.id));
  }, [recipe.id, showCookMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage, unavailable during SSR
    setCooked(isMarkedCooked(recipe.id));
  }, [recipe.id]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/folders")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setFolders(data.folders ?? []);
      })
      .catch(() => {
        // Folder list is a nice-to-have here; silently skip if it fails to load.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scaledIngredients = useMemo(() => {
    const ratio = servings / baseServings;
    return recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: scaleQuantity(ing.quantity, ratio),
    }));
  }, [recipe.ingredients, servings, baseServings]);

  async function saveNotes() {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalNotes: notes }),
      });
      if (res.ok) {
        setNotesDirty(false);
        showToast("Notes saved 📝");
      } else {
        const data = await res.json().catch(() => null);
        showToast(data?.error ?? "Couldn't save those notes.");
      }
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleFolderChange(nextFolderId: string) {
    const previousFolderId = folderId;
    setFolderId(nextFolderId);
    const res = await fetch(`/api/recipes/${recipe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: nextFolderId || null }),
    });
    if (res.ok) {
      const folder = folders.find((f) => f.id === nextFolderId);
      showToast(folder ? `Moved to ${folder.emoji ?? ""} ${folder.name} 🗂️` : "Removed from folder");
    } else {
      setFolderId(previousFolderId);
      const data = await res.json().catch(() => null);
      showToast(data?.error ?? "Couldn't move that recipe.");
    }
  }

  function handleMadeThis() {
    markCooked(recipe.id);
    setCooked(true);
    setShowConfetti(true);
    showToast("Nice! Marked as made 🎉");
    setTimeout(() => setShowConfetti(false), 1200);
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-serif text-2xl font-semibold text-rose-deep sm:text-3xl">{recipe.title}</h1>
      {recipe.authorHandle && <p className="text-sm text-dusty-rose">@{recipe.authorHandle}</p>}

      <div className="flex flex-wrap gap-1.5">
        {recipe.difficulty && (
          <Badge className={DIFFICULTY_STYLES[recipe.difficulty]} icon={<ChefHat size={12} />}>
            {DIFFICULTY_LABELS[recipe.difficulty]}
          </Badge>
        )}
        {recipe.totalTimeMinutes != null && (
          <Badge className={TIME_BADGE_STYLE} icon={<Clock3 size={12} />}>
            {formatMinutes(recipe.totalTimeMinutes)}
          </Badge>
        )}
        {recipe.priceLevel && (
          <Badge className={PRICE_STYLES[recipe.priceLevel]} icon={<DollarSign size={12} />}>
            {PRICE_LABELS[recipe.priceLevel]}
            {price ? ` · ${price}` : ""}
          </Badge>
        )}
        {recipe.mealType && (
          <Badge className={MEAL_TYPE_STYLES[recipe.mealType]} icon={<Utensils size={12} />}>
            {MEAL_TYPE_LABELS[recipe.mealType]}
          </Badge>
        )}
        {recipe.dietType && (
          <Badge className={DIET_STYLES[recipe.dietType]}>{DIET_LABELS[recipe.dietType]}</Badge>
        )}
        {recipe.proteinType && recipe.proteinType !== "none" && (
          <Badge>{PROTEIN_LABELS[recipe.proteinType]}</Badge>
        )}
        {pantryNames.length > 0 &&
          (pantryStale ? (
            <Badge wrap className="bg-amber-100 text-amber-800">⚠️ Pantry match may be outdated</Badge>
          ) : (
            <Badge wrap className="bg-sage/25 text-sage-dark">
              🧺 You have {pantryCount.have}/{pantryCount.total} ingredients ✓
            </Badge>
          ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-coral-deep hover:underline"
        >
          Watch on TikTok <ExternalLink size={14} />
        </a>
        <DeleteRecipeButton recipeId={recipe.id} onDeleted={onClose} />
        <select
          value={folderId}
          onChange={(e) => handleFolderChange(e.target.value)}
          className="rounded-full border border-blush-dark/60 bg-white px-3 py-1.5 text-xs font-medium text-dusty-rose outline-none focus:border-coral"
        >
          <option value="">No folder</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.emoji ? `${folder.emoji} ` : ""}
              {folder.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream-soft px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-dusty-rose">Servings</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              aria-label="Decrease servings"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-blush text-rose-deep transition hover:bg-blush-dark"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center font-serif text-lg font-semibold text-rose-deep">
              {servings}
            </span>
            <button
              type="button"
              onClick={() => setServings((s) => s + 1)}
              aria-label="Increase servings"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-blush text-rose-deep transition hover:bg-blush-dark"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        {recipe.nutrition?.caloriesPerServing != null && (
          <span className="flex items-center gap-1 text-sm font-medium text-dusty-rose">
            <Flame size={14} className="text-coral" />
            {recipe.nutrition.caloriesPerServing} cal/serving
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 self-start">
        <button
          type="button"
          onClick={handleCookModeClick}
          className="shine-on-hover inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
        >
          <CookingPot size={16} />
          {resumeStep != null ? `Resume Cooking 🍳 (Step ${resumeStep + 1})` : "Start Cooking 🍳"}
        </button>
        {!isPro && <ProLockBadge reason="cook-mode" />}
      </div>

      <RecipeChecklist recipeId={recipe.id} ingredients={scaledIngredients} instructions={recipe.instructions} />

      <ShopThisRecipeSection
        recipeId={recipe.id}
        ingredients={scaledIngredients}
        pantryNames={pantryNames}
        pantryLoading={pantryLoading}
      />

      {showCookMode && <CookMode recipe={recipe} onClose={() => setShowCookMode(false)} />}

      <div>
        <button
          type="button"
          onClick={handleMadeThis}
          className="relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sage-dark to-sage px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          {cooked ? "Made this again? 🎉" : "I made this! 🎉"}
          {showConfetti && <ConfettiBurst />}
        </button>
      </div>

      <section>
        <h2 className="mb-2 font-serif text-lg font-semibold text-rose-deep">My Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
          placeholder="Tweaks, substitutions, how it turned out…"
          rows={3}
          className="w-full rounded-2xl border border-blush-dark/60 bg-white px-4 py-2.5 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
        />
        {notesDirty && (
          <button
            type="button"
            onClick={saveNotes}
            disabled={savingNotes}
            className="mt-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-4 py-1.5 text-xs font-semibold text-white transition disabled:opacity-60"
          >
            {savingNotes ? "Saving…" : "Save notes"}
          </button>
        )}
      </section>

      {recipe.tips.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold text-rose-deep">Tips</h2>
          <ul className="list-inside list-disc text-sm text-foreground/90">
            {recipe.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>
      )}

      {recipe.nutrition && (
        <section>
          <h2 className="font-serif text-lg font-semibold text-rose-deep">Nutrition Facts</h2>
          <p className="mb-3 text-xs text-dusty-rose">Per serving · estimated, not measured</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {NUTRITION_FIELDS.map(({ key, label, unit }) => {
              const value = recipe.nutrition![key];
              return (
                <div
                  key={key}
                  className="flex flex-col items-center gap-0.5 rounded-2xl bg-cream-soft px-3 py-3 text-center"
                >
                  <span className="font-serif text-xl font-semibold text-rose-deep">
                    {value != null ? `${value}${unit}` : "—"}
                  </span>
                  <span className="text-[11px] font-medium tracking-wide text-dusty-rose uppercase">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {recipe.confidenceNotes && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{recipe.confidenceNotes}</p>
      )}
    </div>
  );
}
