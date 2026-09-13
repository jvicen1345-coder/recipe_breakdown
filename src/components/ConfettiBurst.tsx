"use client";

import { useEffect, useState } from "react";

const COLORS = ["#ff9a76", "#f0714a", "#b0596f", "#c3d3b8", "#9483c4", "#e08a4c"];

interface Piece {
  id: number;
  left: number;
  color: string;
  delay: number;
  size: number;
}

export function ConfettiBurst() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  // Randomizing piece positions is a one-time visual effect, not part of the render
  // output itself — done in an effect so render stays pure.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot randomized burst, not derivable from props/state
    setPieces(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.15,
        size: 5 + Math.random() * 4,
      })),
    );
  }, []);

  return (
    <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </span>
  );
}
