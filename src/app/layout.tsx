import type { Metadata } from "next";
import { Playfair_Display, Quicksand } from "next/font/google";
import "./globals.css";

import { Navbar } from "@/components/Navbar";
import { PantryProvider } from "@/components/PantryProvider";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${quicksand.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col pb-16 sm:pb-0">
        <ToastProvider>
          <PantryProvider>
            <RecipeModalProvider>
              <Navbar />
              {children}
            </RecipeModalProvider>
          </PantryProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
