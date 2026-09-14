"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Home, Plus, Refrigerator, Search, ShoppingCart } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/grocery-list", label: "Grocery List" },
  { href: "/pantry", label: "Pantry" },
  { href: "/nutrition", label: "This Week" },
];

function focusInput(id: string) {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus({ preventScroll: true });
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";

  function handleHomeClick(e: React.MouseEvent) {
    if (!onHome) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAddRecipeClick(e: React.MouseEvent) {
    e.preventDefault();
    if (onHome) {
      focusInput("add-recipe-input");
    } else {
      router.push("/#add-recipe");
    }
  }

  function handleSearchClick(e: React.MouseEvent) {
    e.preventDefault();
    if (onHome) {
      focusInput("recipe-search-input");
    } else {
      router.push("/#recipes");
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-blush-dark/40 bg-cream/70 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          onClick={handleHomeClick}
          className="flex shrink-0 items-center font-serif text-lg font-semibold text-rose-deep"
        >
          Cutesy Eats
        </Link>

        <div className="hidden items-center gap-1 rounded-full bg-white/60 p-1 sm:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={link.label === "Home" ? handleHomeClick : undefined}
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
          onClick={handleAddRecipeClick}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-coral to-rose-deep px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          <Plus size={14} /> Add Recipe
        </Link>
      </nav>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-blush-dark/40 bg-cream/95 backdrop-blur-md sm:hidden">
        <Link
          href="/"
          onClick={handleHomeClick}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-dusty-rose"
        >
          <Home size={18} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link
          href="/#recipes"
          onClick={handleSearchClick}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-dusty-rose"
        >
          <Search size={18} />
          <span className="text-[10px] font-medium">Search</span>
        </Link>
        <Link
          href="/#add-recipe"
          onClick={handleAddRecipeClick}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-coral-deep"
        >
          <Plus size={18} />
          <span className="text-[10px] font-medium">Add</span>
        </Link>
        <Link
          href="/grocery-list"
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-dusty-rose"
        >
          <ShoppingCart size={18} />
          <span className="text-[10px] font-medium">Grocery</span>
        </Link>
        <Link
          href="/pantry"
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-dusty-rose"
        >
          <Refrigerator size={18} />
          <span className="text-[10px] font-medium">Pantry</span>
        </Link>
        <Link
          href="/nutrition"
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-dusty-rose"
        >
          <BarChart3 size={18} />
          <span className="text-[10px] font-medium">Week</span>
        </Link>
      </div>
    </header>
  );
}
