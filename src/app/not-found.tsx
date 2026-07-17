import Link from "next/link";

export default function NotFound() {
  return (
    <div className="clay-lime mx-auto mt-12 flex max-w-md flex-col items-center gap-4 p-10 text-center">
      <div className="clay-puff grid h-16 w-16 place-items-center bg-forest text-3xl text-lime">
        ?
      </div>
      <h1 className="display text-3xl text-forest">page not found</h1>
      <p className="text-sm text-forest-soft">
        This reel may have scrolled past. Let&apos;s get you back on track.
      </p>
      <Link href="/" className="btn btn-forest">
        ← home
      </Link>
    </div>
  );
}
