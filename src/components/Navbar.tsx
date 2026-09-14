"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Home, Plus, Refrigerator, Search, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/grocery-list", label: "Grocery List", icon: ShoppingCart },
  { href: "/pantry", label: "Pantry", icon: Refrigerator },
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
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full transition ${active ? "bg-blush" : ""}`}
    >
      {children}
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";
  const onGroceryPage = pathname === "/grocery-list";
  const onPantryPage = pathname === "/pantry";
  const onNutritionPage = pathname === "/nutrition";

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
                  <Icon size={15} className={active ? "text-coral-deep" : "text-dusty-rose"} />
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
      </header>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-blush-dark/40 bg-cream/95 backdrop-blur-md sm:hidden">
        <Link href="/" onClick={handleHomeClick} className={mobileNavLinkClass(onHome)} aria-current={onHome ? "page" : undefined}>
          <MobileNavIcon active={onHome}>
            <Home size={18} />
          </MobileNavIcon>
          <span className={`text-[10px] ${onHome ? "font-semibold" : "font-medium"}`}>Home</span>
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
          className={mobileNavLinkClass(onGroceryPage)}
          aria-current={onGroceryPage ? "page" : undefined}
        >
          <MobileNavIcon active={onGroceryPage}>
            <ShoppingCart size={18} />
          </MobileNavIcon>
          <span className={`text-[10px] ${onGroceryPage ? "font-semibold" : "font-medium"}`}>Grocery</span>
        </Link>
        <Link
          href="/pantry"
          className={mobileNavLinkClass(onPantryPage)}
          aria-current={onPantryPage ? "page" : undefined}
        >
          <MobileNavIcon active={onPantryPage}>
            <Refrigerator size={18} />
          </MobileNavIcon>
          <span className={`text-[10px] ${onPantryPage ? "font-semibold" : "font-medium"}`}>Pantry</span>
        </Link>
        <Link
          href="/nutrition"
          className={mobileNavLinkClass(onNutritionPage)}
          aria-current={onNutritionPage ? "page" : undefined}
        >
          <MobileNavIcon active={onNutritionPage}>
            <BarChart3 size={18} />
          </MobileNavIcon>
          <span className={`text-[10px] ${onNutritionPage ? "font-semibold" : "font-medium"}`}>Week</span>
        </Link>
      </div>
    </>
  );
}
