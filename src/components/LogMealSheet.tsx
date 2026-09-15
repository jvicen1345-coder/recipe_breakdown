"use client";

import { useState } from "react";
import { Camera } from "lucide-react";

import { BottomSheet } from "./BottomSheet";
import { useToast } from "./ToastProvider";
import type { WeekMealEntry } from "@/lib/types";

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LogMealSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (meal: WeekMealEntry) => void }) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [loggedAt, setLoggedAt] = useState(() => toLocalDatetimeInputValue(new Date()));
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const showToast = useToast();

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/uploads/photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotoUrl(data.url);
    } catch {
      showToast("Couldn't upload that photo — try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      showToast("Give your meal a name first 🌸");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/manual-meal-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          caloriesPerServing: calories ? Number(calories) : null,
          proteinGrams: protein ? Number(protein) : null,
          carbsGrams: carbs ? Number(carbs) : null,
          fatGrams: fat ? Number(fat) : null,
          photoUrl,
          loggedAt: new Date(loggedAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved({
        id: data.log.id,
        kind: "manual",
        recipeId: null,
        title: data.log.name,
        thumbnailUrl: data.log.photoUrl,
        loggedAt: data.log.loggedAt,
        rating: null,
        caloriesPerServing: data.log.caloriesPerServing,
        proteinGrams: data.log.proteinGrams,
        carbsGrams: data.log.carbsGrams,
        fatGrams: data.log.fatGrams,
        orderedViaApp: false,
      });
      showToast("Meal logged 🌸");
      onClose();
    } catch {
      showToast("Couldn't save that meal — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="mb-4 font-serif text-lg font-semibold text-rose-deep">Log a meal 🍽️</h2>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
          Meal name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Leftover pasta"
            className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
            🔥 Calories
            <input
              type="number"
              min={0}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
            💪 Protein (g)
            <input
              type="number"
              min={0}
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
            🍞 Carbs (g)
            <input
              type="number"
              min={0}
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
            🥑 Fat (g)
            <input
              type="number"
              min={0}
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
          When
          <input
            type="datetime-local"
            value={loggedAt}
            onChange={(e) => setLoggedAt(e.target.value)}
            className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
          />
        </label>

        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full bg-blush-soft px-4 py-2 text-xs font-medium text-rose-deep transition hover:bg-blush">
          <Camera size={14} />
          {uploadingPhoto ? "Uploading…" : photoUrl ? "Photo added ✓" : "Add a photo (optional)"}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploadingPhoto}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save meal 🌸"}
        </button>
      </div>
    </BottomSheet>
  );
}
