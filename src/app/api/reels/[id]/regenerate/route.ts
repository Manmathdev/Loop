import { NextResponse } from "next/server";
import { db } from "@/db";
import { reels, flashcards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateReelContent } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }

  const [reel] = await db.select().from(reels).where(eq(reels.id, num)).limit(1);
  if (!reel) {
    return NextResponse.json({ error: "Reel not found." }, { status: 404 });
  }

  await db
    .update(reels)
    .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
    .where(eq(reels.id, num));

  try {
    const out = await generateReelContent({
      url: reel.url,
      content: reel.rawContent ?? "",
      platform: reel.platform,
      fetchedTitle: reel.title,
    });

    await db
      .update(reels)
      .set({
        title: out.title,
        summary: out.summary,
        keyPoints: out.keyPoints,
        tags: out.tags,
        status: "ready",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(reels.id, num));

    // Replace existing cards with fresh ones.
    await db.delete(flashcards).where(eq(flashcards.reelId, num));
    if (out.flashcards.length > 0) {
      await db.insert(flashcards).values(
        out.flashcards.map((c) => ({
          reelId: num,
          front: c.front.slice(0, 400),
          back: c.back.slice(0, 600),
        })),
      );
    }
    return NextResponse.json({ id: num, status: "ready" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI processing failed.";
    await db
      .update(reels)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(reels.id, num));
    return NextResponse.json({ id: num, status: "failed", error: message });
  }
}
