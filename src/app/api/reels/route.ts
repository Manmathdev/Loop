import { NextResponse } from "next/server";
import { db } from "@/db";
import { reels, notes, flashcards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseUrl, fetchOEmbed } from "@/lib/platform";
import { generateReelContent } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: reels.id,
      title: reels.title,
      status: reels.status,
      platform: reels.platform,
      createdAt: reels.createdAt,
    })
    .from(reels)
    .orderBy(reels.createdAt)
    .limit(100);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  let body: { url?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  const content = (body.content ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "A URL is required." }, { status: 400 });
  }

  const parsed = parseUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: "That doesn't look like a valid URL." },
      { status: 400 },
    );
  }

  // Enrich with public oEmbed metadata (title / thumbnail / author).
  const oembed = await fetchOEmbed(parsed.normalized, parsed.platform, parsed.videoId);

  // Insert the reel in a "processing" state, then run the AI.
  const [created] = await db
    .insert(reels)
    .values({
      url: parsed.normalized,
      platform: parsed.platform,
      videoId: parsed.videoId,
      author: oembed.author,
      thumbnailUrl: oembed.thumbnailUrl,
      title: oembed.title,
      status: "processing",
      rawContent: content.slice(0, 8000),
    })
    .returning({ id: reels.id });

  if (!created) {
    return NextResponse.json({ error: "Failed to create reel." }, { status: 500 });
  }

  await db.insert(notes).values({ reelId: created.id, content: "" });

  try {
    const out = await generateReelContent({
      url: parsed.normalized,
      content,
      platform: parsed.platform,
      fetchedTitle: oembed.title,
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
      .where(eq(reels.id, created.id));

    if (out.flashcards.length > 0) {
      await db.insert(flashcards).values(
        out.flashcards.map((c) => ({
          reelId: created.id,
          front: c.front.slice(0, 400),
          back: c.back.slice(0, 600),
        })),
      );
    }

    return NextResponse.json({ id: created.id, status: "ready" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI processing failed.";
    await db
      .update(reels)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(reels.id, created.id));
    // Return the id so the user lands on the reel page and can retry.
    return NextResponse.json(
      { id: created.id, status: "failed", error: message },
      { status: 200 },
    );
  }
}
