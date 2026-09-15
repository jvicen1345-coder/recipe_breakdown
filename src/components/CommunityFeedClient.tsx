"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, Heart } from "lucide-react";

import { useToast } from "./ToastProvider";
import { toggleFavorite } from "@/lib/clientState";

type Filter = "everyone" | "following" | "this_week";

interface FeedPost {
  id: string;
  photoUrl: string;
  photoWidth: number;
  photoHeight: number;
  caption: string | null;
  rating: number;
  heartsCount: number;
  heartedByMe: boolean;
  recipe: { id: string; title: string; authorHandle: string | null; sourceUrl: string };
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: "everyone", label: "Everyone 🌸" },
  { value: "following", label: "Following 💕" },
  { value: "this_week", label: "This Week ✨" },
];

export function CommunityFeedClient() {
  const showToast = useToast();
  const [filter, setFilter] = useState<Filter>("everyone");
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (filter === "following") {
      // No follow-a-user feature exists yet — an honest empty state beats a fake feed.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronous reset when switching to a filter with no data source
      setPosts([]);
      return;
    }
    setPosts(null);
    fetch(`/api/made-it/posts?filter=${filter}`)
      .then((res) => res.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]));
  }, [filter]);

  async function handleHeart(postId: string) {
    setPosts((prev) =>
      prev
        ? prev.map((p) => (p.id === postId ? { ...p, heartedByMe: true, heartsCount: p.heartsCount + 1 } : p))
        : prev,
    );
    const res = await fetch(`/api/made-it/posts/${postId}/heart`, { method: "POST" });
    if (!res.ok) {
      setPosts((prev) =>
        prev
          ? prev.map((p) => (p.id === postId ? { ...p, heartedByMe: false, heartsCount: p.heartsCount - 1 } : p))
          : prev,
      );
    }
  }

  async function handleReport(postId: string) {
    setPosts((prev) => (prev ? prev.filter((p) => p.id !== postId) : prev));
    await fetch(`/api/made-it/posts/${postId}/report`, { method: "POST" }).catch(() => {});
    showToast("Reported — thanks for helping keep the community safe 🌸");
  }

  function handleSaveRecipe(recipeId: string) {
    toggleFavorite(recipeId);
    showToast("Saved! 💕");
  }

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold text-rose-deep">Community 🌸</h1>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f.value
                ? "bg-gradient-to-r from-coral to-rose-deep text-white shadow-md"
                : "bg-blush text-rose-deep hover:bg-blush-dark"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {posts === null ? (
        <p className="text-sm text-dusty-rose">Loading…</p>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-blush-dark p-16 text-center">
          <span className="text-4xl">🌸</span>
          <p className="font-serif text-lg text-rose-deep">
            {filter === "following"
              ? "You're not following anyone yet 💕"
              : "No posts yet — be the first to share what you made 🌸"}
          </p>
          <Link
            href="/"
            className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
          >
            Start Cooking 🍳
          </Link>
        </div>
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-14px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/40"
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLightbox(post.photoUrl)}
                  className="block w-full"
                  style={{ aspectRatio: `${post.photoWidth} / ${post.photoHeight}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local upload, not an optimizable remote source */}
                  <img src={post.photoUrl} alt={post.recipe.title} className="h-full w-full rounded-t-2xl object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => !post.heartedByMe && handleHeart(post.id)}
                  aria-label={post.heartedByMe ? "Hearted" : "Heart this post"}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur-sm transition hover:scale-110"
                >
                  <Heart size={15} className={post.heartedByMe ? "fill-coral-deep text-coral-deep" : "text-dusty-rose"} />
                </button>
              </div>

              <div className="flex flex-col gap-1.5 p-3">
                <Link href={`/recipes/${post.recipe.id}`} className="font-serif text-sm font-semibold text-rose-deep hover:underline">
                  {post.recipe.title}
                </Link>
                {post.recipe.authorHandle && (
                  <a
                    href={`https://www.tiktok.com/@${post.recipe.authorHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-dusty-rose hover:underline"
                  >
                    Recipe by @{post.recipe.authorHandle}
                  </a>
                )}
                <p className="text-xs">{"⭐".repeat(post.rating)}</p>
                {post.caption && <p className="text-xs text-dusty-rose italic">{post.caption}</p>}

                <button
                  type="button"
                  onClick={() => handleSaveRecipe(post.recipe.id)}
                  className="mt-1 w-full rounded-full bg-blush px-3 py-1.5 text-xs font-semibold text-rose-deep transition hover:bg-blush-dark"
                >
                  I want to make this 🌸
                </button>
                <button
                  type="button"
                  onClick={() => handleReport(post.id)}
                  className="inline-flex items-center gap-1 self-center text-[10px] text-dusty-rose/50 underline-offset-2 hover:underline"
                >
                  <Flag size={9} /> Report this post 🌸
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local upload, not an optimizable remote source */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
}
