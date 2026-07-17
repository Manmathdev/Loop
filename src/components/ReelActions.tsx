"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReelActions({
  reelId,
  status,
}: {
  reelId: number;
  status: string;
}) {
  const router = useRouter();
  const [regen, setRegen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function regenerate() {
    setRegen(true);
    try {
      await fetch(`/api/reels/${reelId}/regenerate`, { method: "POST" });
      router.refresh();
    } finally {
      setRegen(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this reel and all its cards? This can't be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/reels/${reelId}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={regenerate} disabled={regen} className="btn btn-lime text-xs">
        {regen ? "re-running…" : status === "failed" ? "↻ retry AI" : "↻ regenerate"}
      </button>
      <button onClick={remove} disabled={deleting} className="btn text-xs">
        {deleting ? "deleting…" : "✕ delete"}
      </button>
    </div>
  );
}
