import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cutesy Eats",
    short_name: "Cutesy Eats",
    description: "Turn saved TikTok cooking videos into structured, cookable recipes.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf6ee",
    theme_color: "#ff9a76",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
