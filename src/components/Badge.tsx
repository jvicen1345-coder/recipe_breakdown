import type { ReactNode } from "react";
import clsx from "clsx";

export function Badge({
  children,
  className,
  icon,
  wrap = false,
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  /** Longer, dynamic-length labels (e.g. "You have 2/4 ingredients") need to be able
   * to wrap onto a second line instead of overflowing a narrow card/viewport. */
  wrap?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        wrap ? "whitespace-normal" : "whitespace-nowrap",
        className ?? "bg-cream-soft text-dusty-rose",
      )}
    >
      {icon}
      {children}
    </span>
  );
}
