import { NextResponse } from "next/server";
import { db } from "@/db";
import { flashcards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { applyRating } from "@/lib/srs";
import type { Rating } from "@/lib/types";
import { getDueQueue } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const queue = await getDueQueue(80);
  return NextResponse.json({ count: queue.length, cards: queue });
}

export async function POST(req: Request) {
  let body: { cardId?: number; rating?: Rating };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const cardId = Number(body.cardId);
  const rating = body.rating;
  if (!Number.isFinite(cardId) || !["again", "hard", "good", "easy"].includes(rating ?? "")) {
    return NextResponse.json({ error: "cardId and rating required." }, { status: 400 });
  }

  const [card] = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.id, cardId))
    .limit(1);
  if (!card) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  const next = applyRating(
    { ease: card.ease, intervalDays: card.intervalDays, repetitions: card.repetitions },
    rating as Rating,
  );

  await db
    .update(flashcards)
    .set({
      ease: next.ease,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      dueAt: next.dueAt,
      lastReviewedAt: new Date(),
    })
    .where(eq(flashcards.id, cardId));

  return NextResponse.json({ ok: true, dueAt: next.dueAt, intervalDays: next.intervalDays });
}
