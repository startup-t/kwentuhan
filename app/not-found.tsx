import Link from "next/link";

export default function NotFound() {
  return (
    <main className="kw-bg min-h-dvh flex items-center justify-center px-5">
      <div className="relative z-10 flex flex-col items-center text-center gap-4 max-w-sm w-full">
        <span className="text-5xl">🔍</span>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-playfair), serif", color: "var(--kw-text)" }}
        >
          Page not found
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--kw-subtext)" }}>
          This link may have expired or the kwento was never saved. Ask the
          sender to share a fresh link.
        </p>
        <Link
          href="/"
          className="btn-primary px-8 py-3 text-sm"
          style={{ textDecoration: "none" }}
        >
          Go to Kwentuhan
        </Link>
      </div>
    </main>
  );
}
