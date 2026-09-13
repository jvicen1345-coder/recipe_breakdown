"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteRecipeButton({
  recipeId,
  onDeleted,
}: {
  recipeId: string;
  /** Called instead of the default redirect-to-home — used when this button lives inside a modal. */
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Remove this recipe from your library?")) return;
    setDeleting(true);
    const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
    if (res.ok) {
      if (onDeleted) {
        onDeleted();
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-2 rounded-lg border border-blush-dark px-3 py-1.5 text-sm text-dusty-rose transition hover:border-coral hover:text-coral-deep disabled:opacity-60"
    >
      {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      Remove
    </button>
  );
}
