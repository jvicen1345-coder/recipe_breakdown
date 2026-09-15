import type { Metadata, Viewport } from "next";
import { Playfair_Display, Quicksand } from "next/font/google";
import "./globals.css";

import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/PageTransition";
import { PantryOnboardingProvider } from "@/components/PantryOnboardingProvider";
import { PantryProvider } from "@/components/PantryProvider";
import { PlanProvider } from "@/components/PlanProvider";
import { ProUpsellProvider } from "@/components/ProUpsellProvider";
import { RecipeModalProvider } from "@/components/RecipeModalProvider";
import { ToastProvider } from "@/components/ToastProvider";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cutesy Eats 🌸🍴",
  description: "Turn saved TikTok cooking videos into structured, cookable recipes.",
  // Names the app on iOS when added to the home screen — pairs with app/icon.tsx,
  // app/apple-icon.tsx, and app/manifest.ts for the same "CE" gradient icon everywhere.
  appleWebApp: { capable: true, title: "Cutesy Eats", statusBarStyle: "black-translucent" },
};

// Pinch-zoom breaks this layout's fixed bottom nav / full-screen overlays (Cook
// Mode, the swiper, bottom sheets), so it's disabled app-wide.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ff9a76",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${quicksand.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col pb-16 sm:pb-0">
        <ToastProvider>
          <PlanProvider>
            <PantryProvider>
              <PantryOnboardingProvider>
                <ProUpsellProvider>
                  <RecipeModalProvider>
                    <Navbar />
                    <PageTransition>{children}</PageTransition>
                  </RecipeModalProvider>
                </ProUpsellProvider>
              </PantryOnboardingProvider>
            </PantryProvider>
          </PlanProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
