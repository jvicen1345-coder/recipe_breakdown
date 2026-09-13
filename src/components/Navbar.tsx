"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/recipes", label: "My Recipes" },
  { href: "/grocery-list", label: "Grocery List" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-blush-dark/40 bg-cream/70 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 font-serif text-lg font-semibold text-rose-deep"
        >
          <span aria-hidden>🌸🍴</span>
          Petal Eats
        </Link>

        <div className="hidden items-center gap-1 rounded-full bg-white/60 p-1 sm:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active ? "bg-white text-rose-deep shadow-sm" : "text-dusty-rose hover:text-rose-deep"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <Link
          href="/#add-recipe"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-coral to-rose-deep px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          <Plus size={14} /> Add Recipe
        </Link>
      </nav>

      <div className="flex justify-center gap-1 border-t border-blush-dark/30 px-2 py-1.5 sm:hidden">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 rounded-full px-2 py-1 text-center text-xs font-medium transition ${
                active ? "bg-blush text-rose-deep" : "text-dusty-rose"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
