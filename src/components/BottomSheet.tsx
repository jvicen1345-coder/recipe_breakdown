"use client";

import { useEffect, useRef, useState } from "react";

// Shared blush bottom-sheet shell — draggable pill handle, soft shadow, dismiss by
// swiping down or tapping the backdrop. Callers mount/unmount it to open/close.
export function BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handlePointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    startYRef.current = e.clientY;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    setDragY(Math.max(0, e.clientY - startYRef.current));
  }

  function handlePointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragY > 90) onClose();
    else setDragY(0);
  }

  return (
    <div className="overlay-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ transform: `translateY(${dragY}px)` }}
        className="sheet-slide-up w-full max-w-lg touch-none rounded-t-3xl bg-blush-soft px-5 pt-3 pb-6 shadow-[0_-20px_50px_-20px_rgba(192,120,140,0.5)]"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-blush-dark" />
        {children}
      </div>
    </div>
  );
}
