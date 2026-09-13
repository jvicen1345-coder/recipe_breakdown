"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";

import { RecipeThumbnail } from "./RecipeThumbnail";
import type { RecipeDto } from "@/lib/types";

interface CollectionEntry {
  sourceUrl: string;
  title: string;
  uploader: string | null;
  thumbnailUrl: string | null;
}

type ItemStatus = "importing" | "ok" | "duplicate" | "error";

interface ItemResult {
  status: ItemStatus;
  message?: string;
  recipeId?: string;
}

export function CollectionImport({ onImported }: { onImported: (recipe: RecipeDto) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [collectionTitle, setCollectionTitle] = useState<string | null>(null);
  const [entries, setEntries] = useState<CollectionEntry[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, ItemResult>>({});
  const [importing, setImporting] = useState(false);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loadingPreview) return;

    setLoadingPreview(true);
    setPreviewError(null);
    setEntries(null);
    setResults({});

    try {
      const res = await fetch("/api/collections/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPreviewError(data.error ?? "Couldn't read that collection.");
        return;
      }

      setCollectionTitle(data.collection.title);
      setEntries(data.collection.entries);
      setSelected(new Set(data.collection.entries.map((entry: CollectionEntry) => entry.sourceUrl)));
    } catch {
      setPreviewError("Couldn't reach the server. Please try again.");
    } finally {
      setLoadingPreview(false);
    }
  }

  function toggleEntry(sourceUrl: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sourceUrl)) next.delete(sourceUrl);
      else next.add(sourceUrl);
      return next;
    });
  }

  async function handleImport() {
    if (!entries || selected.size === 0 || importing) return;

    const urls = entries.filter((entry) => selected.has(entry.sourceUrl)).map((entry) => entry.sourceUrl);
    setImporting(true);
    setResults(Object.fromEntries(urls.map((u) => [u, { status: "importing" as ItemStatus }])));

    try {
      const res = await fetch("/api/collections/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Import failed to start.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const result = JSON.parse(line) as {
            url: string;
            status: ItemStatus;
            message?: string;
            recipeId?: string;
            recipe?: RecipeDto;
          };
          setResults((prev) => ({
            ...prev,
            [result.url]: {
              status: result.status,
              message: result.message,
              recipeId: result.recipeId ?? result.recipe?.id,
            },
          }));
          if (result.status === "ok" && result.recipe) {
            onImported(result.recipe);
          }
        }
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Import was interrupted. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-blush-dark/50 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-sm font-medium text-rose-deep"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Import a whole Collection instead
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-4">
          <form onSubmit={handlePreview} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              required
              inputMode="url"
              placeholder="https://www.tiktok.com/@user/collection/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loadingPreview || importing}
              className="flex-1 rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loadingPreview || importing || !url.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blush px-5 py-2.5 text-sm font-semibold text-rose-deep transition hover:bg-blush-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingPreview ? <Loader2 size={16} className="animate-spin" /> : null}
              {loadingPreview ? "Loading…" : "Preview"}
            </button>
          </form>

          {previewError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-coral-deep">{previewError}</p>
          )}

          {entries && (
            <>
              <p className="text-sm text-dusty-rose">
                <span className="font-medium text-rose-deep">{collectionTitle}</span> — {entries.length}{" "}
                video
                {entries.length === 1 ? "" : "s"} found. Uncheck any you don&apos;t want.
              </p>

              <div className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-xl border border-blush p-1">
                {entries.map((entry) => {
                  const result = results[entry.sourceUrl];
                  return (
                    <label
                      key={entry.sourceUrl}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-blush-soft"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(entry.sourceUrl)}
                        onChange={() => toggleEntry(entry.sourceUrl)}
                        disabled={importing}
                        className="size-4 shrink-0 accent-coral"
                      />
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-blush-soft">
                        <RecipeThumbnail src={entry.thumbnailUrl} alt={entry.title} className="h-full w-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{entry.title}</p>
                        {entry.uploader && (
                          <p className="truncate text-xs text-dusty-rose">@{entry.uploader}</p>
                        )}
                      </div>
                      <ResultBadge result={result} />
                    </label>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-gradient-to-r from-coral to-rose-deep px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? <Loader2 size={16} className="animate-spin" /> : null}
                {importing ? "Importing…" : `Import ${selected.size} selected`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultBadge({ result }: { result?: ItemResult }) {
  if (!result) return null;

  if (result.status === "importing") {
    return <Loader2 size={16} className="shrink-0 animate-spin text-dusty-rose" />;
  }
  if (result.status === "ok") {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-sage-dark">
        <Check size={14} /> Saved
      </span>
    );
  }
  if (result.status === "duplicate") {
    return result.recipeId ? (
      <Link
        href={`/recipes/${result.recipeId}`}
        className="shrink-0 text-xs font-medium text-dusty-rose underline"
      >
        Already saved
      </Link>
    ) : (
      <span className="shrink-0 text-xs font-medium text-dusty-rose">Already saved</span>
    );
  }
  return (
    <span
      title={result.message}
      className="flex shrink-0 items-center gap-1 text-xs font-medium text-coral-deep"
    >
      <X size={14} /> Failed
    </span>
  );
}
