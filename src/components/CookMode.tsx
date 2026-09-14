"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Timer as TimerIcon, X } from "lucide-react";

import { ConfettiBurst } from "./ConfettiBurst";
import { useToast } from "./ToastProvider";
import { markCooked } from "@/lib/clientState";
import { detectTimer } from "@/lib/cookTimers";
import type { RecipeDto } from "@/lib/types";

interface ActiveTimer {
  id: string;
  stepIndex: number;
  label: string;
  remaining: number;
  done: boolean;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CookMode({
  recipe,
  onClose,
  introMessage,
}: {
  recipe: RecipeDto;
  onClose: () => void;
  introMessage?: string;
}) {
  const totalSteps = recipe.instructions.length;
  const [stepIndex, setStepIndex] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [showRating, setShowRating] = useState(false);
  const [saving, setSaving] = useState(false);
  const showToast = useToast();
  const touchStartX = useRef<number | null>(null);
  const nextTimerId = useRef(0);
  const vibratedIds = useRef<Set<string>>(new Set());

  const isCelebration = stepIndex >= totalSteps;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (timers.length === 0) return;
    const interval = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => (t.done ? t : { ...t, remaining: Math.max(0, t.remaining - 1), done: t.remaining - 1 <= 0 })),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [timers.length]);

  useEffect(() => {
    for (const t of timers) {
      if (t.done && !vibratedIds.current.has(t.id)) {
        vibratedIds.current.add(t.id);
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([200, 80, 200]);
      }
    }
  }, [timers]);

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, totalSteps));
  }
  function goPrev() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta < -50) goNext();
    else if (delta > 50) goPrev();
  }

  function startTimer(atStepIndex: number, minutes: number) {
    const id = `t${nextTimerId.current++}`;
    setTimers((prev) => [
      ...prev,
      { id, stepIndex: atStepIndex, label: `Step ${atStepIndex + 1}`, remaining: minutes * 60, done: false },
    ]);
  }

  function dismissTimer(id: string) {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }

  async function finishCook(rating?: number) {
    setSaving(true);
    try {
      await fetch(`/api/recipes/${recipe.id}/cook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rating ? { rating } : {}),
      });
    } catch {
      // Cook history is a nice-to-have; the local "made this" mark below still lands either way.
    }
    markCooked(recipe.id);
    showToast("Marked as cooked! 🎉");
    onClose();
  }

  const currentStepText = !isCelebration ? recipe.instructions[stepIndex] : "";
  const detected = !isCelebration ? detectTimer(currentStepText) : null;
  const timerAlreadyStarted = timers.some((t) => t.stepIndex === stepIndex);
  const progressPct = Math.min(100, ((stepIndex + 1) / Math.max(1, totalSteps)) * 100);

  return (
    <div className="overlay-fade-in fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-blush-soft via-cream to-cream-soft">
      <div className="h-1.5 w-full bg-blush">
        <div
          className="h-full bg-gradient-to-r from-coral to-rose-deep transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          aria-label="Exit cook mode"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-rose-deep shadow-sm transition hover:bg-white"
        >
          <X size={18} />
        </button>
        {!isCelebration && (
          <span className="text-xs font-medium text-dusty-rose">
            Step {stepIndex + 1} of {totalSteps}
          </span>
        )}
        <span className="w-9" />
      </div>

      {introMessage && stepIndex === 0 && (
        <p className="mx-auto mt-2 max-w-xs text-center text-xs font-semibold text-coral-deep">{introMessage}</p>
      )}

      <div
        className="flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden px-6 py-4 text-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isCelebration ? (
          <div className="card-fade-in relative flex flex-col items-center gap-5">
            <ConfettiBurst />
            <h1 className="font-serif text-3xl font-semibold text-rose-deep sm:text-4xl">You did it! 🎉</h1>
            <p className="text-sm text-dusty-rose">{recipe.title} is ready to enjoy ✨</p>

            {saving ? (
              <p className="text-sm text-dusty-rose">Saving… 🌸</p>
            ) : !showRating ? (
              <button
                type="button"
                onClick={() => setShowRating(true)}
                className="rounded-full bg-gradient-to-r from-sage-dark to-sage px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
              >
                I made this! 💕
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-dusty-rose">Rate your cook</p>
                <div className="flex gap-1 text-2xl">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => finishCook(n)}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      className="transition hover:scale-125"
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => finishCook()}
                  className="text-xs font-medium text-dusty-rose underline-offset-2 hover:underline"
                >
                  Skip rating
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {stepIndex > 0 && (
              <p className="line-clamp-2 max-w-md text-sm text-dusty-rose/70">{recipe.instructions[stepIndex - 1]}</p>
            )}
            <p
              key={stepIndex}
              className="card-fade-in max-w-lg font-serif text-2xl leading-snug font-semibold text-rose-deep sm:text-3xl"
            >
              {currentStepText}
            </p>
            {stepIndex < totalSteps - 1 && (
              <p className="line-clamp-2 max-w-md text-sm text-dusty-rose/70">{recipe.instructions[stepIndex + 1]}</p>
            )}

            {detected && !timerAlreadyStarted && (
              <button
                type="button"
                onClick={() => startTimer(stepIndex, detected.minutes)}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-coral to-rose-deep px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
              >
                <TimerIcon size={14} /> Start Timer ⏱ ({detected.minutes}m)
              </button>
            )}
          </>
        )}
      </div>

      {!isCelebration && (
        <div className="flex items-center justify-between px-6 pb-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={stepIndex === 0}
            aria-label="Previous step"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-rose-deep shadow-sm transition hover:bg-white disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next step"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-coral to-rose-deep text-white shadow-md transition hover:brightness-105"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {timers.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-blush-dark/40 bg-white/80 px-4 py-3 backdrop-blur-sm">
          {timers.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => t.done && dismissTimer(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition ${
                t.done ? "timer-pulse bg-coral-deep text-white" : "bg-blush text-rose-deep"
              }`}
            >
              {t.done ? "Time's up! ✨" : `${t.label} · ${formatClock(t.remaining)}`}
            </button>
          ))}
        </div>
      )}

      {showExitConfirm && (
        <div className="overlay-fade-in fixed inset-0 z-10 flex items-center justify-center bg-black/30 px-6">
          <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-xl">
            <p className="font-serif text-lg font-semibold text-rose-deep">Come back when you&apos;re ready 🌸</p>
            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 rounded-full bg-blush px-4 py-2 text-sm font-medium text-rose-deep transition hover:bg-blush-dark"
              >
                Keep Cooking
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full bg-gradient-to-r from-coral to-rose-deep px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
