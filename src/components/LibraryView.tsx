"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ReelWithCounts } from "@/lib/types";
import { ReelCard } from "./ReelCard";
import { platformMeta } from "@/lib/platform";

export function LibraryView({ reels }: { reels: ReelWithCounts[] }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    reels.forEach((r) => r.tags?.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [reels]);

  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    reels.forEach((r) => r.platform && set.add(r.platform));
    return [...set];
  }, [reels]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return reels.filter((r) => {
      if (platform && r.platform !== platform) return false;
      if (tag && !(r.tags ?? []).includes(tag)) return false;
      if (query) {
        const hay = `${r.title ?? ""} ${r.summary ?? ""} ${(r.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [reels, q, tag, platform]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="display text-3xl text-forest sm:text-4xl">library</h1>
        <p className="mono text-xs text-forest-mist">
          {reels.length} reel{reels.length === 1 ? "" : "s"} captured ·{" "}
          {filtered.length} shown
        </p>
      </div>

      {/* Controls */}
      <div className="clay flex flex-col gap-3 p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search notes, titles, tags…"
          className="field text-sm"
        />

        {allPlatforms.length > 0 && (
          <ChipRow>
            {allPlatforms.map((p) => (
              <FilterChip
                key={p}
                active={platform === p}
                onClick={() => setPlatform((cur) => (cur === p ? null : p))}
              >
                {platformMeta(p).glyph} {platformMeta(p).label}
              </FilterChip>
            ))}
          </ChipRow>
        )}

        {allTags.length > 0 && (
          <ChipRow>
            {allTags.map((t) => (
              <FilterChip
                key={t}
                active={tag === t}
                onClick={() => setTag((cur) => (cur === t ? null : t))}
              >
                #{t}
              </FilterChip>
            ))}
          </ChipRow>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="clay flex flex-col items-center gap-3 p-10 text-center">
          <p className="display text-xl text-forest">no reels match</p>
          <p className="text-sm text-forest-soft">Try clearing your filters.</p>
          <Link href="/" className="btn btn-lime mt-1">
            capture a reel →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <ReelCard key={r.id} reel={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`mono rounded-full border-2 border-forest px-2.5 py-1 text-[11px] transition ${
        active ? "bg-lime font-bold" : "bg-paper hover:bg-lime-soft"
      }`}
    >
      {children}
    </button>
  );
}
