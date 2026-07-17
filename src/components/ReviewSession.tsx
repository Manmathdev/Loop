"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReviewQueueCard, Rating } from "@/lib/types";
import { previewIntervals } from "@/lib/srs";
import { platformMeta } from "@/lib/platform";
import { haptic } from "@/lib/native";

const ORDER: Rating[] = ["again", "hard", "good", "easy"];
const KEY: Record<string, Rating> = { "1": "again", "2": "hard", "3": "good", "4": "easy" };
const BTN_STYLE: Record<Rating, string> = {
  again: "btn",
  hard: "btn",
  good: "btn btn-lime",
  easy: "btn btn-forest",
};

export function ReviewSession({ cards }: { cards: ReviewQueueCard[] }) {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<Record<Rating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [finished, setFinished] = useState(false);

  const total = cards.length;
  const card = cards[i];
  const done = i;

  const intervals = useMemo(() => {
    if (!card) return null;
    return previewIntervals({
      ease: card.ease,
      intervalDays: card.intervalDays,
      repetitions: card.repetitions,
    });
  }, [card]);

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card || busy) return;
      setBusy(true);
      void haptic(
        rating === "again" ? "heavy" : rating === "hard" ? "medium" : "success",
      );
      setCounts((c) => ({ ...c, [rating]: c[rating] + 1 }));
      try {
        await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.cardId, rating }),
        });
      } catch {
        /* network errors are non-fatal for the session */
      }
      if (i + 1 >= total) {
        setFinished(true);
      } else {
        setI((v) => v + 1);
        setRevealed(false);
      }
      setBusy(false);
    },
    [card, busy, i, total],
  );

  // Keyboard: space = reveal, 1-4 = rate.
  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        if (!revealed) {
          e.preventDefault();
          setRevealed(true);
        }
      } else if (KEY[e.key]) {
        if (revealed) rate(KEY[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, rate, finished]);

  if (total === 0 || finished) {
    return <CompleteScreen counts={counts} done={done} total={total} />;
  }

  const meta = platformMeta(card.platform);
  const pct = Math.round((done / total) * 100);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress */}
      <div className="w-full max-w-xl">
        <div className="mb-2 flex items-center justify-between mono text-xs text-forest-mist">
          <span>
            card {done + 1} / {total}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="bar-track h-3">
          <div className="bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Flip card */}
      <div className="flip w-full max-w-xl">
        <div className={`flip-inner ${revealed ? "is-flipped" : ""}`}>
          {/* FRONT */}
          <div className="flip-face clay flex min-h-[19rem] flex-col p-6 sm:min-h-[22rem] sm:p-8">
            <div className="flex items-center justify-between">
              <span
                className="mono rounded-lg border-[3px] border-forest px-2 py-0.5 text-xs font-bold"
                style={{ background: meta.accent, color: "#FBF9F0" }}
              >
                {meta.glyph} {meta.label}
              </span>
              <span className="mono text-[11px] text-forest-mist">recall</span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
              <span className="mono text-[11px] uppercase tracking-widest text-forest-mist">
                question
              </span>
              <p className="display text-2xl text-balance text-forest sm:text-3xl">
                {card.front}
              </p>
            </div>
            <button
              onClick={() => {
                setRevealed(true);
                void haptic("light");
              }}
              className="btn btn-lime w-full text-sm"
            >
              show answer <span aria-hidden>↻</span>
              <span className="ml-1 hidden text-[10px] opacity-60 sm:inline">[space]</span>
            </button>
          </div>
          {/* BACK */}
          <div className="flip-face flip-back clay-forest flex min-h-[19rem] flex-col p-6 sm:min-h-[22rem] sm:p-8">
            <div className="flex items-center justify-between">
              <span className="mono text-[11px] uppercase tracking-widest text-lime">
                answer
              </span>
              <span className="mono text-[11px] text-lime/60">
                from “{card.reelTitle?.slice(0, 24) || "reel"}”
              </span>
            </div>
            <div className="flex flex-1 items-center justify-center py-6 text-center">
              <p className="text-lg leading-relaxed text-paper text-balance sm:text-xl">
                {card.back}
              </p>
            </div>
            <span className="text-center mono text-[11px] text-lime/70">
              how well did you recall it?
            </span>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      <div
        className={`grid w-full max-w-xl grid-cols-2 gap-3 transition-opacity duration-200 sm:grid-cols-4 ${
          revealed ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {ORDER.map((r, idx) => (
          <button
            key={r}
            onClick={() => rate(r)}
            disabled={busy}
            className={`${BTN_STYLE[r]} flex-col !gap-0.5 py-3 text-xs`}
          >
            <span className="capitalize">{r}</span>
            <span className="text-[10px] opacity-70">
              {intervals?.[r]} <span className="opacity-50">[{idx + 1}]</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mono text-[11px] text-forest-mist">
        tip: press <b>space</b> to flip, <b>1–4</b> to rate
      </p>
    </div>
  );
}

function CompleteScreen({
  counts,
  done,
  total,
}: {
  counts: Record<Rating, number>;
  done: number;
  total: number;
}) {
  const reviewed = done || total;
  return (
    <div className="clay-lime mx-auto flex w-full max-w-xl flex-col items-center gap-5 p-8 text-center pop-in sm:p-12">
      <div className="clay-puff grid h-20 w-20 place-items-center bg-forest text-4xl text-lime">
        ✓
      </div>
      <h2 className="display text-3xl text-forest">
        {total === 0 ? "all caught up!" : "session complete!"}
      </h2>
      <p className="max-w-sm text-sm text-forest-soft">
        {total === 0
          ? "Nothing due right now. Capture more reels to build your deck — knowledge compounds."
          : `You reviewed ${reviewed} card${reviewed === 1 ? "" : "s"}. The ones you nailed just moved further into the future.`}
      </p>

      {reviewed > 0 && (
        <div className="grid w-full grid-cols-4 gap-2">
          {ORDER.map((r) => (
            <div key={r} className="clay-sm bg-paper py-2">
              <div className="display text-2xl text-forest">{counts[r]}</div>
              <div className="mono text-[10px] capitalize text-forest-mist">
                {r}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Link href="/" className="btn btn-forest flex-1">
          capture more
        </Link>
        <Link href="/review" className="btn flex-1">
          refresh deck
        </Link>
      </div>
    </div>
  );
}
