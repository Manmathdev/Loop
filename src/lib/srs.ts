import type { Rating } from "./types";

/**
 * SM-2 spaced-repetition scheduler (Anki-style, 4 buttons).
 * Returns the new scheduling state for a card after a review.
 */
export interface SrsState {
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: Date;
}

const QUALITY: Record<Rating, number> = { again: 0, hard: 3, good: 4, easy: 5 };

export const NEW_CARD_EASE = 2.5;

export function applyRating(
  state: { ease: number; intervalDays: number; repetitions: number },
  rating: Rating,
  now: Date = new Date(),
): SrsState {
  const q = QUALITY[rating];
  let { ease, intervalDays, repetitions } = state;

  // Ease factor update (standard SM-2, clamped at 1.3).
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  if (q < 3) {
    // Lapsed: relearn soon, reset streak.
    repetitions = 0;
    intervalDays = 0;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = rating === "easy" ? 2 : 1;
    } else if (repetitions === 2) {
      intervalDays = rating === "easy" ? 5 : 3;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * ease));
    }
  }

  const dueAt =
    q < 3
      ? new Date(now.getTime() + 10 * 60 * 1000) // relearn in 10 minutes
      : new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return { ease: round(ease, 2), intervalDays, repetitions, dueAt };
}

/** Projected next interval for each rating button (for UX labels). */
export function previewIntervals(
  state: { ease: number; intervalDays: number; repetitions: number },
): Record<Rating, string> {
  const out = {} as Record<Rating, string>;
  (["again", "hard", "good", "easy"] as Rating[]).forEach((r) => {
    const next = applyRating(state, r);
    out[r] = humanizeInterval(next.intervalDays, r);
  });
  return out;
}

export function humanizeInterval(intervalDays: number, rating?: Rating): string {
  if (rating === "again" || intervalDays === 0) return "10 min";
  if (intervalDays === 1) return "1 day";
  if (intervalDays < 30) return `${intervalDays} days`;
  const months = Math.round(intervalDays / 30);
  if (months < 12) return `${months} mo`;
  const years = (intervalDays / 365).toFixed(1);
  return `${years} yr`;
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
