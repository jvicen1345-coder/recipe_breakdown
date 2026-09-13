import type { ReactNode } from "react";
import clsx from "clsx";

export function Badge({
  children,
  className,
  icon,
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        className ?? "bg-cream-soft text-dusty-rose",
      )}
    >
      {icon}
      {children}
    </span>
  );
}
