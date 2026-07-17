import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-forest bg-cream/85 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <LogoMark />
          <span className="display text-xl tracking-tight text-forest sm:text-2xl">
            Loop<span className="text-forest-mist">back</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/library"
            className="btn btn-lime hidden text-xs sm:inline-flex sm:text-sm"
          >
            Library
          </Link>
          <Link href="/review" className="btn btn-forest text-xs sm:text-sm">
            <span className="hidden sm:inline">Review</span>
            <span className="sm:hidden">Cards</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

function LogoMark() {
  return (
    <span className="clay-puff grid h-10 w-10 place-items-center bg-lime">
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 text-forest"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 12a9 9 0 0 1 15-6.7" />
        <path d="M21 12a9 9 0 0 1-15 6.7" />
        <path d="M18 2v3.3h-3.3" />
        <path d="M6 22v-3.3h3.3" />
      </svg>
    </span>
  );
}
