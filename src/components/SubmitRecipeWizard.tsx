"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import { useToast } from "./ToastProvider";
import {
  CUISINE_TYPES,
  DIET_TAG_OPTIONS,
  MIN_DESCRIPTION_LENGTH,
  MIN_INGREDIENTS,
  MIN_STEPS,
  MIN_STORY_LENGTH,
  STORY_PLACEHOLDERS,
} from "@/lib/communityConstants";

interface WizardIngredient {
  amount: string;
  unit: string;
  name: string;
}

const TOTAL_STEPS = 7;
const STORY_PLACEHOLDER = STORY_PLACEHOLDERS[Math.floor(Math.random() * STORY_PLACEHOLDERS.length)];

function blockPaste(e: React.ClipboardEvent) {
  e.preventDefault();
}

export function SubmitRecipeWizard() {
  const router = useRouter();
  const showToast = useToast();
  const [step, setStep] = useState(1);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisineType, setCuisineType] = useState<string | null>(null);
  const [dietTags, setDietTags] = useState<string[]>([]);
  const [cookTimeMinutes, setCookTimeMinutes] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | null>(null);

  const [ingredients, setIngredients] = useState<WizardIngredient[]>([
    { amount: "", unit: "", name: "" },
    { amount: "", unit: "", name: "" },
    { amount: "", unit: "", name: "" },
  ]);
  const [steps, setSteps] = useState<string[]>(["", "", ""]);
  const [story, setStory] = useState("");

  const [photo, setPhoto] = useState<{ url: string; width: number; height: number } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [nutrition, setNutrition] = useState({ calories: "", protein: "", carbs: "", fat: "" });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ pointsAwarded: number } | null>(null);

  const filledIngredients = ingredients.filter((i) => i.name.trim());
  const filledSteps = steps.filter((s) => s.trim());

  const stepValid: Record<number, boolean> = {
    1: title.trim().length > 0 && description.trim().length >= MIN_DESCRIPTION_LENGTH,
    2: filledIngredients.length >= MIN_INGREDIENTS,
    3: filledSteps.length >= MIN_STEPS,
    4: story.trim().length >= MIN_STORY_LENGTH,
    5: photo != null,
    6: true,
    7: true,
  };

  function toggleDietTag(tag: string) {
    setDietTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function updateIngredient(index: number, patch: Partial<WizardIngredient>) {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)));
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, value: string) {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/community/upload-photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setPhotoError(data.error ?? "Couldn't use that photo — try another.");
        return;
      }
      setPhoto({ url: data.url, width: data.width, height: data.height });
    } catch {
      setPhotoError("Couldn't upload that photo — try again.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  function buildPayload(action: "draft" | "submit") {
    const hasNutrition = Object.values(nutrition).some((v) => v.trim().length > 0);
    return {
      action,
      title: title.trim(),
      description: description.trim(),
      cuisineType,
      dietTags,
      cookTimeMinutes: cookTimeMinutes ? Number(cookTimeMinutes) : null,
      difficulty,
      ingredients: filledIngredients,
      instructions: filledSteps,
      story: story.trim(),
      photoUrl: photo?.url ?? null,
      photoWidth: photo?.width ?? null,
      photoHeight: photo?.height ?? null,
      nutrition: hasNutrition
        ? {
            caloriesPerServing: nutrition.calories ? Number(nutrition.calories) : null,
            proteinGrams: nutrition.protein ? Number(nutrition.protein) : null,
            carbsGrams: nutrition.carbs ? Number(nutrition.carbs) : null,
            fatGrams: nutrition.fat ? Number(nutrition.fat) : null,
          }
        : null,
    };
  }

  async function handleSubmit(action: "draft" | "submit") {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/community/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(action)),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Something went wrong — try again.");
        return;
      }
      if (action === "draft") {
        showToast("Saved as a draft 🌸");
        router.push("/profile");
      } else {
        setResult({ pointsAwarded: data.pointsAwarded });
      }
    } catch {
      setSubmitError("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <span className="text-5xl">🎉</span>
        <h1 className="font-serif text-2xl font-semibold text-rose-deep">Submitted for review!</h1>
        <p className="text-sm text-dusty-rose">
          You just earned <span className="font-semibold text-coral-deep">+{result.pointsAwarded} points</span> 🌸 —
          you&apos;ll get more once it&apos;s approved.
        </p>
        <Link
          href="/profile"
          className="mt-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
        >
          Back to profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link href="/profile" className="inline-flex w-fit items-center gap-1 text-sm text-dusty-rose hover:text-rose-deep">
        <ArrowLeft size={14} /> Back to profile
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl font-semibold text-rose-deep">Share a recipe 🍓</h1>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition ${i + 1 <= step ? "bg-coral" : "bg-blush-dark/40"}`}
            />
          ))}
        </div>
        <p className="text-xs text-dusty-rose">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-blush-dark/50 bg-white/85 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)] backdrop-blur-sm">
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-lg font-semibold text-rose-deep">The basics</h2>
            <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
              Recipe name
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Grandma's Sunday Sauce"
                className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
              Short description (in your own words)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What is this dish and why do you love it?"
                className="rounded-2xl border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
              />
              <span className="self-end text-[10px] text-dusty-rose/70">
                {description.trim().length}/{MIN_DESCRIPTION_LENGTH} min
              </span>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-dusty-rose">Cuisine type</span>
              <div className="flex flex-wrap gap-2">
                {CUISINE_TYPES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCuisineType((prev) => (prev === c ? null : c))}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      cuisineType === c ? "bg-gradient-to-r from-coral to-rose-deep text-white" : "bg-blush text-rose-deep hover:bg-blush-dark"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-dusty-rose">Diet tags</span>
              <div className="flex flex-wrap gap-2">
                {DIET_TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDietTag(tag)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      dietTags.includes(tag) ? "bg-gradient-to-r from-sage-dark to-sage text-white" : "bg-blush text-rose-deep hover:bg-blush-dark"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
                Cook time (min)
                <input
                  type="number"
                  min={1}
                  value={cookTimeMinutes}
                  onChange={(e) => setCookTimeMinutes(e.target.value)}
                  className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
                />
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-dusty-rose">Difficulty</span>
                <div className="flex gap-1.5">
                  {(["easy", "medium", "hard"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty((prev) => (prev === d ? null : d))}
                      className={`flex-1 rounded-full px-2 py-2 text-xs font-medium capitalize transition ${
                        difficulty === d ? "bg-gradient-to-r from-coral to-rose-deep text-white" : "bg-blush text-rose-deep hover:bg-blush-dark"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-lg font-semibold text-rose-deep">Ingredients</h2>
            <p className="text-xs text-dusty-rose">Add each one by hand — at least {MIN_INGREDIENTS}, no pasting 🌸</p>
            <div className="flex flex-col gap-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(i, { amount: e.target.value })}
                    onPaste={blockPaste}
                    placeholder="2"
                    className="w-14 rounded-full border border-blush-dark/60 bg-white px-3 py-2 text-sm text-rose-deep outline-none focus:border-coral"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                    onPaste={blockPaste}
                    placeholder="cups"
                    className="w-20 rounded-full border border-blush-dark/60 bg-white px-3 py-2 text-sm text-rose-deep outline-none focus:border-coral"
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, { name: e.target.value })}
                    onPaste={blockPaste}
                    placeholder="flour"
                    className="flex-1 rounded-full border border-blush-dark/60 bg-white px-4 py-2 text-sm text-rose-deep outline-none focus:border-coral"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    aria-label="Remove ingredient"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-dusty-rose hover:bg-blush-soft"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIngredients((prev) => [...prev, { amount: "", unit: "", name: "" }])}
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blush-soft px-4 py-2 text-xs font-medium text-rose-deep transition hover:bg-blush"
            >
              <Plus size={12} /> Add ingredient
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-lg font-semibold text-rose-deep">Steps</h2>
            <p className="text-xs text-dusty-rose">Add each step by hand — at least {MIN_STEPS}, no pasting 🌸</p>
            <div className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-semibold text-rose-deep">
                    {i + 1}
                  </span>
                  <textarea
                    value={s}
                    onChange={(e) => updateStep(i, e.target.value)}
                    onPaste={blockPaste}
                    rows={2}
                    placeholder={`Step ${i + 1}`}
                    className="flex-1 rounded-2xl border border-blush-dark/60 bg-white px-4 py-2 text-sm text-rose-deep outline-none focus:border-coral"
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    aria-label="Remove step"
                    className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-dusty-rose hover:bg-blush-soft"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSteps((prev) => [...prev, ""])}
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blush-soft px-4 py-2 text-xs font-medium text-rose-deep transition hover:bg-blush"
            >
              <Plus size={12} /> Add step
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-lg font-semibold text-rose-deep">The story</h2>
            <p className="text-sm text-dusty-rose">
              What makes this recipe yours? Where did it come from, what did you tweak, what do you love about it? 🎀
            </p>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              rows={6}
              placeholder={STORY_PLACEHOLDER}
              className="rounded-2xl border border-blush-dark/60 bg-white px-4 py-3 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
            />
            <span className="self-end text-[10px] text-dusty-rose/70">
              {story.trim().length}/{MIN_STORY_LENGTH} min
            </span>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="font-serif text-lg font-semibold text-rose-deep">A real photo from your kitchen 📸</h2>
            <p className="text-xs text-dusty-rose">No screenshots please — just your dish, however it turned out 🌸</p>

            {photo ? (
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- local upload, not an optimizable remote source */}
                <img src={photo.url} alt="Your dish" className="h-48 w-48 rounded-2xl object-cover" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="text-xs font-medium text-dusty-rose underline-offset-2 hover:underline"
                >
                  Choose a different photo
                </button>
              </div>
            ) : (
              <label className="flex h-48 w-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blush-dark/50 bg-blush-soft/40 text-dusty-rose transition hover:border-coral">
                <Camera size={28} />
                <span className="text-xs font-medium">{uploadingPhoto ? "Uploading…" : "Tap to add a photo"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
              </label>
            )}
            {photoError && <p className="text-xs text-coral-deep">{photoError}</p>}
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-lg font-semibold text-rose-deep">Nutrition (optional)</h2>
            <p className="text-xs text-dusty-rose">Fill these in if you know them — our AI will estimate if not 🌸</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
                🔥 Calories
                <input
                  type="number"
                  min={0}
                  value={nutrition.calories}
                  onChange={(e) => setNutrition((prev) => ({ ...prev, calories: e.target.value }))}
                  className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
                💪 Protein (g)
                <input
                  type="number"
                  min={0}
                  value={nutrition.protein}
                  onChange={(e) => setNutrition((prev) => ({ ...prev, protein: e.target.value }))}
                  className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
                🍞 Carbs (g)
                <input
                  type="number"
                  min={0}
                  value={nutrition.carbs}
                  onChange={(e) => setNutrition((prev) => ({ ...prev, carbs: e.target.value }))}
                  className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
                🥑 Fat (g)
                <input
                  type="number"
                  min={0}
                  value={nutrition.fat}
                  onChange={(e) => setNutrition((prev) => ({ ...prev, fat: e.target.value }))}
                  className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral"
                />
              </label>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-lg font-semibold text-rose-deep">Review &amp; submit</h2>
            {photo && (
              /* eslint-disable-next-line @next/next/no-img-element -- local upload, not an optimizable remote source */
              <img src={photo.url} alt={title} className="h-40 w-full rounded-2xl object-cover" />
            )}
            <p className="font-serif text-lg font-semibold text-rose-deep">{title || "Untitled recipe"}</p>
            <p className="text-sm text-dusty-rose">{description}</p>
            <div className="flex flex-wrap gap-1.5">
              {cuisineType && <span className="rounded-full bg-blush px-2.5 py-1 text-[10px] font-semibold text-rose-deep">{cuisineType}</span>}
              {dietTags.map((tag) => (
                <span key={tag} className="rounded-full bg-sage/25 px-2.5 py-1 text-[10px] font-semibold text-sage-dark">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-dusty-rose">
              {filledIngredients.length} ingredients · {filledSteps.length} steps
            </p>
            {submitError && <p className="text-sm text-coral-deep">{submitError}</p>}
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSubmit("submit")}
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit for review ✨"}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit("draft")}
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blush px-6 py-2.5 text-sm font-semibold text-rose-deep transition hover:bg-blush-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save as draft
              </button>
            </div>
          </div>
        )}
      </div>

      {step < 7 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="inline-flex items-center gap-1 rounded-full bg-blush px-4 py-2 text-sm font-medium text-rose-deep transition hover:bg-blush-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
            disabled={!stepValid[step]}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-coral to-rose-deep px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
