import { NextResponse } from "next/server";
import { db } from "@/db";
import { reels, notes, flashcards } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function reelCount(): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reels);
  return rows[0]?.n ?? 0;
}

interface Seed {
  url: string;
  platform: string;
  author: string;
  title: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  cards: { front: string; back: string }[];
}

const SEEDS: Seed[] = [
  {
    url: "https://www.youtube.com/shorts/buoyancy-explained",
    platform: "youtube",
    author: "Physics Kitchen",
    title: "Why massive ships don't sink",
    summary:
      "Ships float thanks to Archimedes' principle: the upward buoyant force equals the weight of water the hull pushes aside. Because steel hulls trap huge volumes of air, the vessel's overall density stays below water's, so it floats.",
    keyPoints: [
      "Buoyancy = weight of the fluid displaced by the object.",
      "A steel ship floats because its hollow hull makes its average density lower than water.",
      "If the ship takes on water, average density rises above 1 g/cm³ and it sinks.",
      "Depth matters: the deeper a surface sits, the greater the pressure pushing up.",
    ],
    tags: ["physics", "buoyancy", "science"],
    cards: [
      {
        front: "What determines whether an object floats or sinks?",
        back: "Its average density vs. the fluid. If the object's average density is less than the fluid's, it floats.",
      },
      {
        front: "State Archimedes' principle in one sentence.",
        back: "The buoyant force on a submerged object equals the weight of the fluid it displaces.",
      },
      {
        front: "Why can a heavy steel ship float when a steel ball sinks?",
        back: "The hull encloses a large volume of air, so the ship's average density is below water's, even though steel itself is denser.",
      },
    ],
  },
  {
    url: "https://www.tiktok.com/@learnfast/feynman",
    platform: "tiktok",
    author: "@learnfast",
    title: "The Feynman Technique for learning",
    summary:
      "Named after physicist Richard Feynman, this method says you only truly understand something when you can explain it simply. Teaching exposes the gaps in your own knowledge, which targeted study then fills.",
    keyPoints: [
      "Pick a concept and explain it as if teaching a child.",
      "Use plain language — no jargon hiding your uncertainty.",
      "Wherever you stumble or get vague, that's your knowledge gap.",
      "Go back, fill the gap, then simplify again until it flows.",
    ],
    tags: ["learning", "study", "feynman"],
    cards: [
      {
        front: "What is the core test in the Feynman Technique?",
        back: "If you can't explain a concept in simple, jargon-free language, you don't really understand it yet.",
      },
      {
        front: "What does stumbling during an explanation reveal?",
        back: "It pinpoints your exact knowledge gap — the specific part you need to revisit and relearn.",
      },
      {
        front: "Name the four steps of the Feynman Technique in order.",
        back: "1) Explain it simply, 2) spot the gaps, 3) relearn the weak parts, 4) simplify and retell.",
      },
    ],
  },
  {
    url: "https://www.instagram.com/reel/money-compound",
    platform: "instagram",
    author: "@moneymindset",
    title: "Compound interest: start yesterday",
    summary:
      "Compound interest means your returns start earning their own returns, turning small steady deposits into large sums over decades. Time, not amount, is the most powerful variable — so starting early beats starting big.",
    keyPoints: [
      "Earnings are reinvested, so each period's growth builds on the last.",
      "Investing $200/month at 8% from age 25 can exceed $700k by 65.",
      "Doubling your contributions late rarely beats starting earlier with less.",
      "Time in the market generally beats timing the market.",
    ],
    tags: ["finance", "money", "investing"],
    cards: [
      {
        front: "What makes compound interest 'compound'?",
        back: "Your interest/returns are reinvested, so future returns are calculated on an ever-growing principal.",
      },
      {
        front: "Which matters more for compound growth: amount invested or time?",
        back: "Time. Because growth is exponential, an early start with less money often beats a late start with more.",
      },
      {
        front: "Why does starting at 25 vs. 35 create such a large gap?",
        back: "The extra decade lets returns compound on top of returns many more times — exponential growth rewards time disproportionately.",
      },
    ],
  },
];

export async function POST() {
  const n = await reelCount();
  if (n > 0) {
    return NextResponse.json({ seeded: false, message: "already has data" });
  }

  for (const s of SEEDS) {
    const [created] = await db
      .insert(reels)
      .values({
        url: s.url,
        platform: s.platform,
        author: s.author,
        title: s.title,
        summary: s.summary,
        keyPoints: s.keyPoints,
        tags: s.tags,
        status: "ready",
        rawContent: s.summary,
      })
      .returning({ id: reels.id });
    if (!created) continue;
    await db.insert(notes).values({ reelId: created.id, content: "" });
    await db.insert(flashcards).values(
      s.cards.map((c) => ({ reelId: created.id, front: c.front, back: c.back })),
    );
  }

  return NextResponse.json({ seeded: true, count: SEEDS.length });
}
