"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { EMOJI_CATEGORIES, type EmojiEntry } from "@/lib/emojiData";

export function EmojiPickerSheet({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

  const query = search.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!query) return null;
    const seen = new Set<string>();
    const results: EmojiEntry[] = [];
    for (const category of EMOJI_CATEGORIES) {
      for (const entry of category.emojis) {
        if (seen.has(entry.char)) continue;
        if (entry.keywords.some((k) => k.includes(query))) {
          seen.add(entry.char);
          results.push(entry);
        }
      }
    }
    return results;
  }, [query]);

  function handlePointerDown(e: React.PointerEvent) {
    setDragging(true);
    startYRef.current = e.clientY;
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragY(Math.max(0, e.clientY - startYRef.current));
  }
  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragY > 80) onClose();
    else setDragY(0);
  }

  function pick(emoji: string) {
    onSelect(emoji);
    onClose();
  }

  function emojiButton(entry: EmojiEntry) {
    const selected = entry.char === value;
    return (
      <button
        key={entry.char}
        type="button"
        onClick={() => pick(entry.char)}
        aria-label={entry.keywords[0] ?? entry.char}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl transition ${
          selected ? "bg-white ring-2 ring-coral shadow-sm" : "bg-blush-soft/70 hover:bg-blush"
        }`}
      >
        {entry.char}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-rose-deep/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        style={{ transform: `translateY(${dragY}px)` }}
        className="sheet-slide-up flex max-h-[80vh] w-full max-w-md flex-col gap-4 rounded-t-[2rem] bg-white p-6 shadow-[0_-20px_60px_-20px_rgba(192,120,140,0.5)] sm:max-h-[85vh] sm:rounded-[2rem] sm:shadow-[0_30px_70px_-25px_rgba(192,120,140,0.6)]"
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="-mt-2 flex cursor-grab touch-none justify-center pb-1 active:cursor-grabbing sm:hidden"
        >
          <span className="h-1.5 w-12 rounded-full bg-blush-dark" />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-rose-deep">Choose an emoji 🎀</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-dusty-rose hover:bg-blush-soft"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative shrink-0">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-dusty-rose" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emojis..."
            className="w-full rounded-full border border-blush-dark/60 bg-white py-2.5 pr-4 pl-10 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
          />
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto">
          {searchResults ? (
            searchResults.length === 0 ? (
              <p className="py-6 text-center text-sm text-dusty-rose">
                No emojis matched &quot;{search.trim()}&quot; ✨
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">{searchResults.map(emojiButton)}</div>
            )
          ) : (
            EMOJI_CATEGORIES.map((category) => (
              <div key={category.name} className="flex flex-col gap-2">
                <p className="text-xs font-semibold tracking-wide text-dusty-rose uppercase">{category.label}</p>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {category.emojis.map(emojiButton)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
