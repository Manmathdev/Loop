import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { ReelCard } from "@/components/ReelCard";
import { LoadExamples } from "@/components/LoadExamples";
import { listReelsWithCounts, getReviewStats, getReelCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [recent, stats, total] = await Promise.all([
    listReelsWithCounts(6),
    getReviewStats(),
    getReelCount(),
  ]);

  return (
    <div className="flex flex-col gap-12">
      {/* HERO */}
      <section className="flex flex-col items-center gap-3 pt-4 text-center sm:pt-8">
        <span className="tag">scroll → capture → recall</span>
        <h1 className="display max-w-3xl text-balance text-4xl text-forest sm:text-6xl">
          Turn the scroll into{" "}
          <span className="relative whitespace-nowrap">
            <span className="relative z-10">knowledge</span>
            <span className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-lime sm:h-4" />
          </span>{" "}
          you keep.
        </h1>
        <p className="max-w-xl text-balance text-base text-forest-soft sm:text-lg">
          Paste any reel, Short, or TikTok. Loopback distills it into tidy notes
          and flashcards — then brings them back on a schedule so the good stuff
          actually sticks.
        </p>
      </section>

      {/* CAPTURE */}
      <section className="mx-auto w-full max-w-2xl">
        <div className="clay p-5 sm:p-7">
          <div className="mb-4 flex items-center gap-2">
            <span className="clay-puff grid h-8 w-8 place-items-center bg-lime text-forest">
              +
            </span>
            <h2 className="display text-xl text-forest">capture a reel</h2>
          </div>
          <CaptureForm />
        </div>
      </section>

      {/* STATS */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="reels saved" value={total} accent="lime" />
          <Stat label="cards in deck" value={stats.totalCards} />
          <Stat label="due now" value={stats.dueCards} accent="forest" />
          <Stat label="mastered" value={stats.masteredCards} />
        </div>
      </section>

      {/* DUE BANNER */}
      {stats.dueCards > 0 && (
        <section>
          <Link
            href="/review"
            className="clay-lime lift flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center sm:p-6"
          >
            <div className="flex items-center gap-4">
              <span className="clay-puff grid h-12 w-12 shrink-0 place-items-center bg-forest text-2xl text-lime">
                ⚡
              </span>
              <div>
                <p className="display text-xl text-forest">
                  {stats.dueCards} card{stats.dueCards === 1 ? "" : "s"} due
                </p>
                <p className="text-sm text-forest-soft">
                  A quick review now locks it in. ~30 seconds.
                </p>
              </div>
            </div>
            <span className="btn btn-forest shrink-0">review now →</span>
          </Link>
        </section>
      )}

      {/* RECENT */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <h2 className="display text-2xl text-forest">recent captures</h2>
          {total > 6 && (
            <Link href="/library" className="mono text-sm underline text-forest-mist">
              view all →
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((r) => (
              <ReelCard key={r.id} reel={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "lime" | "forest";
}) {
  const bg = accent === "lime" ? "clay-lime" : accent === "forest" ? "clay-forest" : "clay";
  return (
    <div className={`${bg} p-4`}>
      <div className="display text-3xl sm:text-4xl">{value}</div>
      <div className="mono mt-1 text-[11px] uppercase tracking-wide opacity-70">
        {label}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="clay flex flex-col items-center gap-4 p-8 text-center sm:p-12">
      <div className="clay-puff grid h-16 w-16 place-items-center bg-lime text-3xl text-forest">
        ↻
      </div>
      <div>
        <h3 className="display text-2xl text-forest">your deck is empty</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-forest-soft">
          Capture your first reel above, or load a few examples to see how
          Loopback turns a clip into notes + flashcards.
        </p>
      </div>
      <LoadExamples />
    </div>
  );
}
