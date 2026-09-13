"use client";

import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";

export function RecipeThumbnail({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center text-blush-dark ${className ?? ""}`}>
        <UtensilsCrossed size={28} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external TikTok CDN hostnames rotate, can't be whitelisted
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className ?? ""}`}
    />
  );
}
