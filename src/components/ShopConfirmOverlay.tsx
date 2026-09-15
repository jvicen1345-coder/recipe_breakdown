"use client";

// Shown for a beat right before handing off to a retailer — the list is already
// copied silently by the time this renders, so this is purely reassurance, not an
// extra required step. Dismissible with one thumb tap anywhere outside the card.
export function ShopConfirmOverlay({
  retailerLabel,
  onConfirm,
}: {
  retailerLabel: string;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-rose-deep/30 p-4 backdrop-blur-sm"
      onClick={onConfirm}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[2rem] bg-white p-6 text-center shadow-[0_30px_70px_-25px_rgba(192,120,140,0.6)]"
      >
        <span className="text-3xl">📋</span>
        <h2 className="font-serif text-lg font-semibold text-rose-deep">Your list is copied! 🌸</h2>
        <p className="text-sm text-dusty-rose">
          We&apos;ll open {retailerLabel} with your first ingredient — paste your list to find everything else ✨
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-1 w-full rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
        >
          Got it, let&apos;s shop! 🛒
        </button>
      </div>
    </div>
  );
}
