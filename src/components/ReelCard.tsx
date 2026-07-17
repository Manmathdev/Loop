import Link from "next/link";
import type { ReelWithCounts } from "@/lib/types";
import { platformMeta } from "@/lib/platform";
import { PlatformBadge } from "./PlatformBadge";

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ReelCard({ reel }: { reel: ReelWithCounts }) {
  const pct = reel.cardCount
    ? Math.round((reel.masteredCount / reel.cardCount) * 100)
    : 0;
  const meta = platformMeta(reel.platform);

  return (
    <Link href={`/reel/${reel.id}`} className="clay lift group block overflow-hidden">
      {/* Thumbnail / banner */}
      <div className="relative aspect-video w-full overflow-hidden border-b-[3px] border-forest bg-cream-deep">
        {reel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reel.thumbnailUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-5xl"
            style={{ background: meta.accent, color: "#FBF9F0" }}
          >
            <span aria-hidden>{meta.glyph}</span>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <PlatformBadge platform={reel.platform} size="sm" />
        </div>
        {reel.status === "failed" && (
          <div className="absolute inset-0 grid place-items-center bg-forest/70 p-4 text-center">
            <span className="mono text-xs text-lime">
              couldn&apos;t process this one
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="display text-lg leading-tight text-forest line-clamp-2">
            {reel.title || "Processing…"}
          </h3>
        </div>

        {reel.status === "processing" ? (
          <p className="mono text-xs text-forest-mist">distilling notes…</p>
        ) : reel.summary ? (
          <p className="text-sm leading-snug text-forest-soft line-clamp-2">
            {reel.summary}
          </p>
        ) : null}

        {reel.tags && reel.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reel.tags.slice(0, 3).map((t) => (
              <span key={t} className="tag">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Footer: mastery + counts */}
        <div className="mt-1 flex items-center justify-between gap-3 border-t-2 border-dashed border-forest/25 pt-3">
          <div className="flex items-center gap-3">
            <span className="mono text-[11px] text-forest-mist">
              {timeAgo(reel.createdAt)}
            </span>
            <span className="mono text-[11px] text-forest">
              {reel.cardCount} card{reel.cardCount === 1 ? "" : "s"}
            </span>
          </div>
          {reel.dueCount > 0 && (
            <span className="mono rounded-full border-2 border-forest bg-lime px-2 py-0.5 text-[10px] font-bold">
              {reel.dueCount} due
            </span>
          )}
        </div>

        {reel.cardCount > 0 && (
          <div>
            <div className="mb-1 flex justify-between mono text-[10px] text-forest-mist">
              <span>mastery</span>
              <span>{pct}%</span>
            </div>
            <div className="bar-track h-2.5">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
