import Link from "next/link";
import { getDueQueue } from "@/lib/queries";
import { ReviewSession } from "@/components/ReviewSession";

export const dynamic = "force-dynamic";

export const metadata = { title: "Review — Loopback" };

export default async function ReviewPage() {
  const cards = await getDueQueue(80);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="display text-3xl text-forest sm:text-4xl">recall session</h1>
        <p className="mono text-xs text-forest-mist">
          {cards.length > 0
            ? `${cards.length} card${cards.length === 1 ? "" : "s"} ready to strengthen`
            : "the future of everything you saved"}
        </p>
      </div>

      <ReviewSession cards={cards} />

      {cards.length === 0 && (
        <div className="flex justify-center">
          <Link href="/" className="btn btn-lime">
            capture a reel →
          </Link>
        </div>
      )}
    </div>
  );
}
