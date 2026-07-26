"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application boundary", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F7FA] px-6 text-center text-[#071526]">
      <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-black">This area could not be loaded.</h1>
        <p className="mt-3 text-sm text-slate-600">
          Your data has not been changed. Try loading the page again.
        </p>
        <button type="button" onClick={reset} className="mt-6 rounded-xl bg-[#0F2747] px-5 py-3 font-black text-white">
          Try again
        </button>
      </div>
    </main>
  );
}
