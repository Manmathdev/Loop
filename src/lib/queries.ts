import "server-only";
import { db } from "@/db";
import { reels, notes, flashcards } from "@/db/schema";
import { desc, eq, lte, sql, and, asc } from "drizzle-orm";
import type { ReelWithCounts, ReviewQueueCard } from "./types";

export async function getReelCount(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(reels);
  return row?.n ?? 0;
}

/** Reels enriched with card / due / mastered counts. */
export async function listReelsWithCounts(
  limit?: number,
): Promise<ReelWithCounts[]> {
  const rows = await db
    .select({
      id: reels.id,
      url: reels.url,
      platform: reels.platform,
      videoId: reels.videoId,
      author: reels.author,
      thumbnailUrl: reels.thumbnailUrl,
      status: reels.status,
      title: reels.title,
      summary: reels.summary,
      keyPoints: reels.keyPoints,
      tags: reels.tags,
      errorMessage: reels.errorMessage,
      createdAt: reels.createdAt,
      cardCount: sql<number>`count(${flashcards.id})::int`,
      dueCount: sql<number>`count(${flashcards.id}) filter (where ${flashcards.dueAt} <= now())::int`,
      masteredCount: sql<number>`count(${flashcards.id}) filter (where ${flashcards.intervalDays} >= 21)::int`,
    })
    .from(reels)
    .leftJoin(flashcards, eq(flashcards.reelId, reels.id))
    .groupBy(reels.id)
    .orderBy(desc(reels.createdAt))
    .limit(limit ?? 100);

  return rows as unknown as ReelWithCounts[];
}

export interface ReelDetail {
  reel: (typeof reels.$inferSelect) & { note?: string };
  cards: (typeof flashcards.$inferSelect)[];
}

export async function getReelDetail(id: number): Promise<ReelDetail | null> {
  const [reel] = await db.select().from(reels).where(eq(reels.id, id)).limit(1);
  if (!reel) return null;
  const [note] = await db
    .select()
    .from(notes)
    .where(eq(notes.reelId, id))
    .limit(1);
  const cards = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.reelId, id))
    .orderBy(asc(flashcards.id));
  return { reel: { ...reel, note: note?.content ?? "" }, cards };
}

export async function getDueQueue(limit = 60): Promise<ReviewQueueCard[]> {
  const rows = await db
    .select({
      cardId: flashcards.id,
      front: flashcards.front,
      back: flashcards.back,
      reelId: flashcards.reelId,
      reelTitle: reels.title,
      platform: reels.platform,
      ease: flashcards.ease,
      repetitions: flashcards.repetitions,
      intervalDays: flashcards.intervalDays,
    })
    .from(flashcards)
    .innerJoin(reels, eq(reels.id, flashcards.reelId))
    .where(
      and(eq(reels.status, "ready"), lte(flashcards.dueAt, new Date())),
    )
    .orderBy(asc(flashcards.dueAt))
    .limit(limit);
  return rows as unknown as ReviewQueueCard[];
}

export async function getReviewStats() {
  const [[total], [due], [mastered]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(flashcards),
    db.select({ n: sql<number>`count(*)::int` }).from(flashcards).where(lte(flashcards.dueAt, new Date())),
    db.select({ n: sql<number>`count(*)::int` }).from(flashcards).where(sql`${flashcards.intervalDays} >= 21`),
  ]);
  return {
    totalCards: total?.n ?? 0,
    dueCards: due?.n ?? 0,
    masteredCards: mastered?.n ?? 0,
  };
}
