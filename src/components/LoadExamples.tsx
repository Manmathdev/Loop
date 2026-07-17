"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoadExamples() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await fetch("/api/seed", { method: "POST" });
    } finally {
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <button onClick={load} disabled={loading} className="btn btn-forest">
      {loading ? "loading…" : "load 3 example reels"}
    </button>
  );
}
