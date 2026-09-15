"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BookOpen, Home, Plus, ShoppingCart, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { usePlan } from "./PlanProvider";

const NAV_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/grocery-list", label: "Grocery & Pantry", icon: ShoppingCart },
  { href: "/nutrition", label: "This Week", icon: BarChart3 },
];

function focusInput(id: string) {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus({ preventScroll: true });
}

function mobileNavLinkClass(active: boolean): string {
  return `flex flex-1 flex-col items-center gap-0.5 py-2 transition ${
    active ? "text-coral-deep" : "text-dusty-rose"
  }`;
}

function MobileNavIcon({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${active ? "bg-blush" : ""}`}
      >
        {children}
      </span>
      <span className={`h-1 w-1 rounded-full transition ${active ? "bg-coral-deep" : "bg-transparent"}`} />
    </span>
  );
}

const NO_NAV_ROUTES = new Set(["/login", "/signup"]);

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { pantryOnboardedAt, stalenessLevel } = usePlan();
  const onHome = pathname === "/";
  const onRecipesPage = pathname === "/recipes";
  const onGroceryPage = pathname === "/grocery-list";
  const onNutritionPage = pathname === "/nutrition";
  const showStaleDot = Boolean(pantryOnboardedAt) && stalenessLevel !== "fresh";

  if (NO_NAV_ROUTES.has(pathname)) return null;

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

  return (
    <>
      {/* Desktop-only top bar — on mobile, navigation lives exclusively in the fixed bottom bar below. */}
      <header className="sticky top-0 z-30 hidden border-b border-blush-dark/40 bg-cream/70 backdrop-blur-md sm:block">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            onClick={handleHomeClick}
            className="flex shrink-0 items-center font-serif text-lg font-semibold text-rose-deep"
          >
            Cutesy Eats
          </Link>

          <div className="flex items-center gap-1 rounded-full bg-white/60 p-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={link.label === "Home" ? handleHomeClick : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    active ? "bg-white text-rose-deep shadow-sm" : "text-dusty-rose hover:text-rose-deep"
                  }`}
                >
                  <span className="relative">
                    <Icon size={15} className={active ? "text-coral-deep" : "text-dusty-rose"} />
                    {link.href === "/grocery-list" && showStaleDot && (
                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                  </span>
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/#add-recipe"
              onClick={handleAddRecipeClick}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-coral to-rose-deep px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
            >
              <Plus size={14} /> Add Recipe
            </Link>
            <Link
              href="/profile"
              aria-label="Profile"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-dusty-rose transition hover:text-rose-deep"
            >
              <User size={16} />
            </Link>
          </div>
        </nav>
      </header>

      {/* Slim mobile top bar — just the wordmark + profile access; all other nav lives in the bottom bar. */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-blush-dark/40 bg-cream/70 px-4 py-3 backdrop-blur-md sm:hidden">
        <Link
          href="/"
          onClick={handleHomeClick}
          className="flex shrink-0 items-center font-serif text-lg font-semibold text-rose-deep"
        >
          Cutesy Eats
        </Link>
        <Link
          href="/profile"
          aria-label="Profile"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-dusty-rose transition hover:text-rose-deep"
        >
          <User size={15} />
        </Link>
      </header>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-blush-dark/40 bg-cream/95 backdrop-blur-md sm:hidden">
        <Link href="/" onClick={handleHomeClick} className={mobileNavLinkClass(onHome)} aria-current={onHome ? "page" : undefined}>
          <MobileNavIcon active={onHome}>
            <Home size={18} />
          </MobileNavIcon>
          <span className={`text-[10px] ${onHome ? "font-bold" : "font-medium"}`}>Home</span>
        </Link>
        <Link
          href="/recipes"
          className={mobileNavLinkClass(onRecipesPage)}
          aria-current={onRecipesPage ? "page" : undefined}
        >
          <MobileNavIcon active={onRecipesPage}>
            <BookOpen size={18} />
          </MobileNavIcon>
          <span className={`text-[10px] ${onRecipesPage ? "font-bold" : "font-medium"}`}>Recipes</span>
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
          className={mobileNavLinkClass(onGroceryPage)}
          aria-current={onGroceryPage ? "page" : undefined}
        >
          <MobileNavIcon active={onGroceryPage}>
            <span className="relative">
              <ShoppingCart size={18} />
              {showStaleDot && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />}
            </span>
          </MobileNavIcon>
          <span className={`text-[10px] ${onGroceryPage ? "font-bold" : "font-medium"}`}>Grocery</span>
        </Link>
        <Link
          href="/nutrition"
          className={mobileNavLinkClass(onNutritionPage)}
          aria-current={onNutritionPage ? "page" : undefined}
        >
          <MobileNavIcon active={onNutritionPage}>
            <BarChart3 size={18} />
          </MobileNavIcon>
          <span className={`text-[10px] ${onNutritionPage ? "font-bold" : "font-medium"}`}>Week</span>
        </Link>
      </div>
    </>
  );
}
