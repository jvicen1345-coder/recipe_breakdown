"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Remove this recipe from your library?")) return;
    setDeleting(true);
    const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300"
    >
      {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      Remove
    </button>
  );
}
