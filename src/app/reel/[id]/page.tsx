import Link from "next/link";
import { notFound } from "next/navigation";
import { getReelDetail } from "@/lib/queries";
import { platformMeta } from "@/lib/platform";
import { PlatformBadge } from "@/components/PlatformBadge";
import { NotesEditor } from "@/components/NotesEditor";
import { ReelActions } from "@/components/ReelActions";

export const dynamic = "force-dynamic";

function dueLabel(dueAt: Date, intervalDays: number, reps: number) {
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const isNew = reps === 0 && intervalDays === 0;
  const diff = due - now;
  const day = 86400000;
  if (isNew) return { text: "new · due now", tone: "lime" };
  if (diff <= 0) return { text: "due now", tone: "lime" };
  if (diff < day) return { text: "due in <1d", tone: "cream" };
  const days = Math.round(diff / day);
  if (days < 30) return { text: `due in ${days}d`, tone: "cream" };
  return { text: `due in ${Math.round(days / 30)}mo`, tone: "cream" };
}

export default async function ReelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const num = Number(id);
  const data = Number.isFinite(num) ? await getReelDetail(num) : null;
  if (!data) notFound();

  const { reel, cards } = data;
  const meta = platformMeta(reel.platform);
  const host = (() => {
    try {
      return new URL(reel.url).hostname.replace(/^www\./, "");
    } catch {
      return reel.url;
    }
  })();

  const dueCards = cards.filter(
    (c) => new Date(c.dueAt).getTime() <= Date.now(),
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/library"
        className="mono w-fit text-xs text-forest-mist underline underline-offset-2"
      >
        ← back to library
      </Link>

      {/* HEADER */}
      <header className="clay flex flex-col gap-4 p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <PlatformBadge platform={reel.platform} />
          <div className="min-w-0 flex-1">
            {reel.status === "processing" ? (
              <h1 className="display text-2xl text-forest-mist">Processing…</h1>
            ) : (
              <h1 className="display text-2xl text-forest sm:text-3xl">
                {reel.title}
              </h1>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 mono text-[11px] text-forest-mist">
              {reel.author && <span>by {reel.author} ·</span>}
              <a
                href={reel.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-forest underline underline-offset-2"
              >
                {meta.glyph} {host} ↗
              </a>
            </div>
          </div>
          <ReelActions reelId={reel.id} status={reel.status} />
        </div>

        {/* STATUS / ERROR */}
        {reel.status === "failed" && (
          <div className="clay-sm border-l-4 border-l-forest bg-lime-soft p-3 text-sm">
            <p className="font-semibold text-forest">AI couldn&apos;t process this reel.</p>
            <p className="mono mt-1 text-xs text-forest-mist">{reel.errorMessage}</p>
            <p className="mt-1 text-xs text-forest-soft">
              Try “retry AI” above, or add more of the transcript.
            </p>
          </div>
        )}
        {reel.status === "processing" && (
          <div className="flex items-center gap-3 text-sm text-forest-mist">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-[3px] border-forest border-t-transparent" />
            Loopback is reading the content and writing notes…
          </div>
        )}

        {reel.tags && reel.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reel.tags.map((t) => (
              <span key={t} className="tag">
                #{t}
              </span>
            ))}
          </div>
        )}
      </header>

      {reel.status === "ready" && (
        <>
          {/* SUMMARY + KEY POINTS + NOTES */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="clay flex flex-col gap-4 p-5 sm:p-6">
              <h2 className="display text-xl text-forest">the gist</h2>
              {reel.summary && (
                <p className="text-[15px] leading-relaxed text-forest-soft">
                  {reel.summary}
                </p>
              )}
              {reel.keyPoints && reel.keyPoints.length > 0 && (
                <div>
                  <h3 className="mono mb-2 text-[11px] uppercase tracking-wide text-forest-mist">
                    key points
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {reel.keyPoints.map((p, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-snug">
                        <span className="clay-puff mt-0.5 grid h-5 w-5 shrink-0 place-items-center bg-lime text-[11px] font-bold text-forest">
                          {i + 1}
                        </span>
                        <span className="text-forest">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="clay p-5 sm:p-6">
              <NotesEditor reelId={reel.id} initial={reel.note ?? ""} />
            </section>
          </div>

          {/* FLASHCARDS */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="display text-2xl text-forest">
                recall cards{" "}
                <span className="mono text-base font-normal text-forest-mist">
                  ({cards.length})
                </span>
              </h2>
              {dueCards > 0 && (
                <Link href="/review" className="btn btn-forest text-xs">
                  study {dueCards} due →
                </Link>
              )}
            </div>

            {cards.length === 0 ? (
              <div className="clay p-6 text-center text-sm text-forest-soft">
                No cards yet — click “regenerate” to create some.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {cards.map((c) => {
                  const d = dueLabel(c.dueAt, c.intervalDays, c.repetitions);
                  return (
                    <div key={c.id} className="clay-sm flex flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="mono text-[10px] uppercase tracking-wide text-forest-mist">
                          Q
                        </span>
                        <span
                          className={`mono shrink-0 rounded-full border-2 border-forest px-2 py-0.5 text-[10px] ${
                            d.tone === "lime" ? "bg-lime font-bold" : "bg-cream"
                          }`}
                        >
                          {d.text}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-forest">{c.front}</p>
                      <p className="border-t-2 border-dashed border-forest/20 pt-2 text-sm text-forest-soft">
                        {c.back}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
