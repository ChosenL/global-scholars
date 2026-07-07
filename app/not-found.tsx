import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071526] px-6 text-white">
      <div className="max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
          Page Not Found
        </p>

        <h1 className="mt-6 text-6xl font-black md:text-8xl">404</h1>

        <h2 className="mt-6 text-3xl font-black md:text-5xl">
          This pathway doesn’t exist yet.
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/75">
          The page you’re looking for may have moved, or the link may be incorrect.
          Let’s get you back on the right path.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="rounded-xl bg-[#C8A24A] px-8 py-4 font-bold text-[#071526] transition hover:scale-105"
          >
            Back to Home
          </Link>

          <Link
            href="/#contact"
            className="rounded-xl border border-white px-8 py-4 font-bold text-white transition hover:bg-white hover:text-[#071526]"
          >
            Book Consultation
          </Link>
        </div>
      </div>
    </main>
  );
}