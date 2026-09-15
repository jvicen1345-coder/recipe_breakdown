"use client";

import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, RotateCw } from "lucide-react";

import { ConfettiBurst } from "./ConfettiBurst";
import { useToast } from "./ToastProvider";
import { MAX_CAPTION_LENGTH } from "@/lib/madeItConstants";
import { useShoppingReturnToast } from "@/lib/useShoppingReturnToast";
import type { RecipeDto } from "@/lib/types";

type Step = "rating" | "photo";

interface UploadedPhoto {
  url: string;
  width: number;
  height: number;
}

// Replaces Cook Mode's old plain confetti+rating celebration. Step order: rating
// (required) -> photo + caption (required once sharing) -> share posts to the
// community (awards 1 point) and immediately redirects to the original creator's
// TikTok profile. onFinish() logs the cook exactly once, on every path.
export function MadeItFlow({
  recipe,
  onFinish,
}: {
  recipe: RecipeDto;
  onFinish: (rating: number, options?: { silent?: boolean }) => void;
}) {
  const showToast = useToast();
  const armReturnToast = useShoppingReturnToast("Welcome back! 🌸");
  const [step, setStep] = useState<Step>("rating");
  const [rating, setRating] = useState(0);

  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<UploadedPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const [sharing, setSharing] = useState(false);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setUploadedPhoto(null);
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/community/upload-photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Couldn't use that photo — try another.");
        return;
      }
      setUploadedPhoto({ url: data.url, width: data.width, height: data.height });
    } catch {
      setUploadError("Couldn't upload that photo — try again.");
    } finally {
      setUploading(false);
    }
  }

  // Posts to the community (awarding the point), saves the cook log, and only then
  // redirects to the original creator's TikTok profile — the cook log must finish
  // saving before we ever navigate away, since a fast redirect could otherwise race
  // the still-in-flight rating save and cancel it when the browser starts leaving.
  async function handleShare() {
    if (!uploadedPhoto) return;
    setSharing(true);
    try {
      const res = await fetch("/api/made-it/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: recipe.id,
          photoUrl: uploadedPhoto.url,
          photoWidth: uploadedPhoto.width,
          photoHeight: uploadedPhoto.height,
          rating,
          caption: caption.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error ?? "Couldn't post that — try again.");
        return;
      }
      showToast(`Shared to the community! +1 point 🌸 (${data.points} total) — heading to TikTok next…`);
      await onFinish(rating, { silent: true });
      armReturnToast();
      window.location.href = creatorProfileUrl();
    } finally {
      setSharing(false);
    }
  }

  function creatorProfileUrl(): string {
    return recipe.authorHandle ? `https://www.tiktok.com/@${recipe.authorHandle}` : recipe.sourceUrl;
  }

  return (
    <div className="overlay-fade-in fixed inset-0 z-50 flex flex-col overflow-y-auto bg-gradient-to-b from-blush-soft via-cream to-cream-soft">
      {step === "rating" && (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
          <ConfettiBurst />
          <h1 className="font-serif text-3xl font-semibold text-rose-deep sm:text-4xl">
            You actually made it!! 🎉
          </h1>
          <p className="text-sm text-dusty-rose">Show the world what you created 🌸</p>

          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-rose-deep">How did it turn out?</p>
            <div className="flex gap-1.5 text-3xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className={`transition hover:scale-125 ${n <= rating ? "" : "opacity-30 grayscale"}`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep("photo")}
            disabled={rating === 0}
            className="mt-2 w-full max-w-xs rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Share your creation 📸
          </button>
          <button
            type="button"
            onClick={() => onFinish(rating)}
            className="text-xs font-medium text-dusty-rose/70 underline-offset-2 hover:underline"
          >
            Skip for now
          </button>
        </div>
      )}

      {step === "photo" && (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-6 py-10">
          <button
            type="button"
            onClick={() => setStep("rating")}
            className="self-start text-xs font-medium text-dusty-rose/70 underline-offset-2 hover:underline"
          >
            ← back
          </button>
          {!photoPreviewUrl ? (
            <>
              <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[2rem] border-2 border-dashed border-blush-dark/60 bg-white/50 text-center">
                <span className="text-4xl">📸</span>
                <p className="font-serif text-base font-semibold text-rose-deep">Add a photo of your dish 📸</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
                >
                  <Camera size={16} /> Take a photo 📷
                </button>
                <button
                  type="button"
                  onClick={() => libraryInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-rose-deep shadow-sm ring-1 ring-blush-dark/60 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ImageIcon size={16} /> Choose from library 🖼️
                </button>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
              />
              <input
                ref={libraryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
              />
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] bg-blush-soft">
                {/* eslint-disable-next-line @next/next/no-img-element -- local upload, not an optimizable remote source */}
                <img src={photoPreviewUrl} alt="Your dish" className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-coral/25 via-transparent to-transparent" />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-medium text-rose-deep">
                    Uploading…
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="flex flex-col gap-2 text-center">
                  <p className="text-xs text-coral-deep">{uploadError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreviewUrl(null);
                      setUploadError(null);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 self-center rounded-full bg-blush px-4 py-2 text-xs font-semibold text-rose-deep"
                  >
                    <RotateCw size={12} /> Try a different photo
                  </button>
                </div>
              )}

              <label className="flex flex-col gap-1 text-xs font-medium text-dusty-rose">
                Add a note... (e.g. I added extra garlic 🧄)
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION_LENGTH))}
                  rows={2}
                  className="rounded-2xl border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
                />
                <span className="self-end text-[10px] text-dusty-rose/60">
                  {caption.length}/{MAX_CAPTION_LENGTH}
                </span>
              </label>

              <button
                type="button"
                onClick={handleShare}
                disabled={!uploadedPhoto || uploading || sharing}
                className="w-full rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sharing ? "Sharing…" : "Share to Cutesy Eats + TikTok 🌸"}
              </button>
              <p className="text-center text-[11px] text-dusty-rose/70">
                Posting to Cutesy Eats earns +1 point 🌸{" "}
                {recipe.authorHandle
                  ? `— then we'll take you to @${recipe.authorHandle} on TikTok to share it there too`
                  : "— then we'll take you back to the original video to share it there too"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
