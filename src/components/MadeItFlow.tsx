"use client";

import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, RotateCw } from "lucide-react";

import { ConfettiBurst } from "./ConfettiBurst";
import { useToast } from "./ToastProvider";
import { CUTESY_EATS_TAG, MAX_CAPTION_LENGTH, TIKTOK_COMMENT_STARTERS } from "@/lib/madeItConstants";
import { useShoppingReturnToast } from "@/lib/useShoppingReturnToast";
import type { RecipeDto } from "@/lib/types";

type Step = "rating" | "photo" | "preview";

interface UploadedPhoto {
  url: string;
  width: number;
  height: number;
}

function randomStarterIndex(excluding?: number): number {
  if (TIKTOK_COMMENT_STARTERS.length <= 1) return 0;
  let next = Math.floor(Math.random() * TIKTOK_COMMENT_STARTERS.length);
  while (next === excluding) next = Math.floor(Math.random() * TIKTOK_COMMENT_STARTERS.length);
  return next;
}

// Replaces Cook Mode's old plain confetti+rating celebration. Step order: rating
// (required) -> photo (required once sharing) -> two-card preview -> one of three
// share actions -> onFinish() logs the cook exactly once, on every path.
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

  const [commentIndex, setCommentIndex] = useState(() => randomStarterIndex());
  const [comment, setComment] = useState(TIKTOK_COMMENT_STARTERS[commentIndex]);
  const [includeTag, setIncludeTag] = useState(true);
  const [sharing, setSharing] = useState<"both" | "community" | "tiktok" | null>(null);
  const [pendingTikTok, setPendingTikTok] = useState(false);

  function cycleComment() {
    const next = randomStarterIndex(commentIndex);
    setCommentIndex(next);
    setComment(TIKTOK_COMMENT_STARTERS[next]);
  }

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

  function finalComment(): string {
    const trimmed = comment.trim();
    return includeTag ? `${trimmed}\n\n${CUTESY_EATS_TAG}` : trimmed;
  }

  async function copyCommentToClipboard() {
    try {
      await navigator.clipboard.writeText(finalComment());
    } catch {
      // Silent by design — the deep link below still works either way.
    }
    setPendingTikTok(true);
  }

  // The cook log must finish saving before we ever navigate away — a fast tap on
  // "Got it, let's go!" used to be able to race the still-in-flight rating save and
  // cancel it when the browser started leaving for TikTok. Awaiting onFinish here
  // (which itself awaits its own POST) guarantees the rating is safely recorded
  // first, whether or not the user actually goes on to TikTok.
  async function confirmTikTokHandoff() {
    setPendingTikTok(false);
    await onFinish(rating, { silent: true });
    armReturnToast();
    window.location.href = recipe.sourceUrl;
  }

  async function dismissTikTokWithoutGoing() {
    setPendingTikTok(false);
    await onFinish(rating, { silent: true });
  }

  async function postToCommunity(): Promise<number | null> {
    if (!uploadedPhoto) return null;
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
      return null;
    }
    return data.points as number;
  }

  async function handleShareBoth() {
    setSharing("both");
    try {
      const points = await postToCommunity();
      if (points == null) return;
      showToast(`Amazing!! +1 point earned 🌸 keep cooking to earn more ✨ (${points} total)`);
      await copyCommentToClipboard();
    } finally {
      setSharing(null);
    }
  }

  async function handleShareCommunityOnly() {
    setSharing("community");
    try {
      const points = await postToCommunity();
      if (points == null) return;
      showToast(`Shared to the community! +1 point 🌸 (${points} total)`);
      onFinish(rating, { silent: true });
    } finally {
      setSharing(null);
    }
  }

  async function handleTikTokOnly() {
    setSharing("tiktok");
    try {
      await copyCommentToClipboard();
    } finally {
      setSharing(null);
    }
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
                onClick={() => setStep("preview")}
                disabled={!uploadedPhoto || uploading}
                className="w-full rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Looks good! 🌸
              </button>
            </div>
          )}
        </div>
      )}

      {step === "preview" && uploadedPhoto && (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8">
          <button
            type="button"
            onClick={() => setStep("photo")}
            className="self-start text-xs font-medium text-dusty-rose/70 underline-offset-2 hover:underline"
          >
            ← back
          </button>
          <h1 className="text-center font-serif text-xl font-semibold text-rose-deep">Share your creation 🌸</h1>

          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:items-start">
            <div className="flex flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_10px_30px_-14px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/40">
              <div className="relative aspect-square w-full bg-blush-soft">
                {/* eslint-disable-next-line @next/next/no-img-element -- local upload, not an optimizable remote source */}
                <img src={uploadedPhoto.url} alt={recipe.title} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col gap-1 p-4">
                <p className="font-serif text-sm font-semibold text-rose-deep">Made it! 🎉</p>
                <p className="text-sm text-foreground">{recipe.title}</p>
                {recipe.authorHandle && <p className="text-xs text-dusty-rose">@{recipe.authorHandle}</p>}
                <p className="text-sm">{"⭐".repeat(rating)}</p>
                {caption && <p className="text-xs text-dusty-rose italic">{caption}</p>}
                <p className="mt-1 text-[11px] font-medium text-coral-deep">🌸 Posting to Cutesy Eats</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-[1.75rem] bg-white p-4 shadow-[0_10px_30px_-14px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/40">
              <div className="flex items-center justify-between gap-2">
                <p className="font-serif text-sm font-semibold text-rose-deep">🎵 Comment on their TikTok</p>
                <button
                  type="button"
                  onClick={cycleComment}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blush px-2.5 py-1 text-[11px] font-medium text-rose-deep transition hover:bg-blush-dark"
                >
                  <RotateCw size={11} /> Try another
                </button>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="rounded-2xl border border-blush-dark/60 bg-white px-4 py-2.5 text-sm text-rose-deep outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
              />
              {includeTag && <p className="text-[11px] text-dusty-rose/70">{CUTESY_EATS_TAG}</p>}
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-blush-soft px-3 py-2.5">
                <span className="text-xs font-medium text-rose-deep">Include {CUTESY_EATS_TAG} 🌸</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeTag}
                  onClick={() => setIncludeTag((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${includeTag ? "bg-coral" : "bg-blush-dark"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${includeTag ? "left-5" : "left-0.5"}`}
                  />
                </button>
              </label>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-col gap-2.5">
            <button
              type="button"
              onClick={handleShareBoth}
              disabled={sharing !== null}
              className="w-full rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharing === "both" ? "Sharing…" : "Share both 🌸"}
            </button>
            <button
              type="button"
              onClick={handleShareCommunityOnly}
              disabled={sharing !== null}
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-rose-deep shadow-sm ring-1 ring-coral/50 transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharing === "community" ? "Posting…" : "Just post to Cutesy Eats"}
            </button>
            <button
              type="button"
              onClick={handleTikTokOnly}
              disabled={sharing !== null}
              className="text-xs font-medium text-dusty-rose underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharing === "tiktok" ? "Opening…" : "Just comment on TikTok"}
            </button>
          </div>
        </div>
      )}

      {pendingTikTok && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-rose-deep/30 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[2rem] bg-white p-6 text-center shadow-[0_30px_70px_-25px_rgba(192,120,140,0.6)]">
            <span className="text-3xl">📋</span>
            <p className="font-serif text-lg font-semibold text-rose-deep">Your comment is copied 🌸</p>
            <p className="text-sm text-dusty-rose">Just paste and post 🌸</p>
            <button
              type="button"
              onClick={confirmTikTokHandoff}
              className="mt-1 w-full rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            >
              Got it, let&apos;s go! 🎵
            </button>
            <button
              type="button"
              onClick={dismissTikTokWithoutGoing}
              className="text-xs font-medium text-dusty-rose/70 underline-offset-2 hover:underline"
            >
              Not right now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
