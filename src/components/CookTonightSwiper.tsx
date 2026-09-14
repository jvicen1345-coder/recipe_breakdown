"use client";

import { useEffect, useRef, useState } from "react";
import { ChefHat, Clock3, DollarSign, X } from "lucide-react";

import { CookMode } from "./CookMode";
import { RecipeThumbnail } from "./RecipeThumbnail";
import { getCookedTimestamps } from "@/lib/clientState";
import { formatMinutes, formatPriceUsd } from "@/lib/format";
import type { RecipeDto } from "@/lib/types";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Recipes not cooked in 7+ days (or never) come first, ones cooked 3-7 days ago are
// neutral, and anything cooked in the last 3 days sinks to the back — shuffled
// within each bucket so it doesn't feel like the same fixed order every time.
function buildQueue(recipes: RecipeDto[]): RecipeDto[] {
  const cooked = getCookedTimestamps();
  const now = Date.now();
  const priority: RecipeDto[] = [];
  const neutral: RecipeDto[] = [];
  const deprioritized: RecipeDto[] = [];

  for (const recipe of recipes) {
    const ts = cooked[recipe.id];
    if (!ts) {
      priority.push(recipe);
      continue;
    }
    const days = (now - new Date(ts).getTime()) / 86_400_000;
    if (days > 7) priority.push(recipe);
    else if (days >= 3) neutral.push(recipe);
    else deprioritized.push(recipe);
  }

  return [...shuffle(priority), ...shuffle(neutral), ...shuffle(deprioritized)];
}

export function CookTonightSwiper({ recipes, onClose }: { recipes: RecipeDto[]; onClose: () => void }) {
  const [queue] = useState(() => buildQueue(recipes));
  const [queueIndex, setQueueIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const [chosenRecipe, setChosenRecipe] = useState<RecipeDto | null>(null);
  const startXRef = useRef(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (chosenRecipe) {
    return <CookMode recipe={chosenRecipe} onClose={onClose} introMessage="Great choice! Let's get cooking 🍳" />;
  }

  const visible = queue.slice(queueIndex, queueIndex + 3);
  const allDone = queueIndex >= queue.length;

  function triggerSwipe(direction: "left" | "right") {
    if (exiting) return;
    setExiting(direction);
    setDragX(direction === "right" ? 700 : -700);
    setTimeout(() => {
      if (direction === "right") {
        setChosenRecipe(queue[queueIndex]);
      } else {
        setQueueIndex((i) => i + 1);
      }
      setExiting(null);
      setDragX(0);
    }, 260);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (exiting) return;
    setDragging(true);
    startXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startXRef.current);
  }
  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragX > 100) triggerSwipe("right");
    else if (dragX < -100) triggerSwipe("left");
    else setDragX(0);
  }

  return (
    <div className="overlay-fade-in fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-blush-soft via-cream to-cream-soft">
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close swiper"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-rose-deep shadow-sm transition hover:bg-white"
        >
          <X size={18} />
        </button>
        <span className="font-serif text-lg font-semibold text-rose-deep">Cook Tonight? 🌙</span>
        <span className="w-9" />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 py-6">
        {allDone ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-4xl">🌸</span>
            <p className="font-serif text-xl font-semibold text-rose-deep">All caught up!</p>
            <p className="text-sm text-dusty-rose">Add more recipes above ✨</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            >
              Back to homepage
            </button>
          </div>
        ) : (
          <div className="relative h-[26rem] w-full max-w-sm">
            {visible
              .slice()
              .reverse()
              .map((recipe, reverseIndex) => {
                const i = visible.length - 1 - reverseIndex;
                const isTop = i === 0;
                const price = formatPriceUsd(recipe.estimatedPriceUsd);
                return (
                  <div
                    key={recipe.id}
                    onPointerDown={isTop ? handlePointerDown : undefined}
                    onPointerMove={isTop ? handlePointerMove : undefined}
                    onPointerUp={isTop ? handlePointerUp : undefined}
                    style={{
                      transform: isTop
                        ? `translateX(${dragX}px) rotate(${dragX / 18}deg)`
                        : `scale(${1 - i * 0.05}) translateY(${i * 10}px)`,
                      transition: isTop && dragging ? "none" : "transform 0.3s ease-out",
                      zIndex: 10 - i,
                    }}
                    className="absolute inset-0 touch-none overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_50px_-20px_rgba(192,120,140,0.55)]"
                  >
                    <div className="relative h-2/3 w-full bg-blush-soft">
                      <RecipeThumbnail src={recipe.thumbnailUrl} alt={recipe.title} className="h-full w-full" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
                      {isTop && (
                        <>
                          <div
                            style={{ opacity: Math.max(0, dragX / 100) }}
                            className="absolute top-6 left-6 -rotate-12 rounded-full bg-mint-dark/90 px-4 py-1.5 text-sm font-bold text-white"
                          >
                            Let&apos;s cook! ✅
                          </div>
                          <div
                            style={{ opacity: Math.max(0, -dragX / 100) }}
                            className="absolute top-6 right-6 rotate-12 rounded-full bg-blush-dark/95 px-4 py-1.5 text-sm font-bold text-rose-deep"
                          >
                            Skip 👋
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex h-1/3 flex-col justify-center gap-2 px-5 py-3">
                      <h3 className="font-serif text-lg font-semibold text-rose-deep">{recipe.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs text-dusty-rose">
                        {recipe.totalTimeMinutes != null && (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 size={12} /> {formatMinutes(recipe.totalTimeMinutes)}
                          </span>
                        )}
                        {recipe.difficulty && (
                          <span className="inline-flex items-center gap-1">
                            <ChefHat size={12} /> {recipe.difficulty}
                          </span>
                        )}
                        {price && (
                          <span className="inline-flex items-center gap-1">
                            <DollarSign size={12} /> {price}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {!allDone && (
        <div className="flex items-center justify-center gap-8 pb-8">
          <button
            type="button"
            onClick={() => triggerSwipe("left")}
            aria-label="Maybe later"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-[0_10px_25px_-10px_rgba(192,120,140,0.5)] transition hover:scale-110"
          >
            👋
          </button>
          <button
            type="button"
            onClick={() => triggerSwipe("right")}
            aria-label="Yes, tonight!"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sage to-sage-dark text-2xl shadow-[0_10px_25px_-10px_rgba(127,154,114,0.6)] transition hover:scale-110"
          >
            ✅
          </button>
        </div>
      )}
    </div>
  );
}
