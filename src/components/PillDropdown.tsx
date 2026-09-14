"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// A single pill that opens a small floating menu — condenses a row of many
// single-select filter pills (diet, sort, …) down to one, since only one
// option can ever be active at a time anyway.
export function PillDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  active,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Whether to render in the "filter applied" gradient style vs. the neutral blush style. */
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
          active
            ? "bg-gradient-to-r from-coral to-rose-deep text-white shadow-md"
            : "bg-blush text-rose-deep shadow-[0_2px_6px_-1px_rgba(192,120,140,0.35)] hover:-translate-y-0.5 hover:bg-blush-dark hover:shadow-[0_4px_10px_-1px_rgba(192,120,140,0.45)]"
        }`}
      >
        {label}
        {selected?.label}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_15px_40px_-12px_rgba(192,120,140,0.5)] ring-1 ring-blush-dark/40">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                opt.value === value ? "bg-blush font-semibold text-rose-deep" : "text-dusty-rose hover:bg-blush-soft"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
