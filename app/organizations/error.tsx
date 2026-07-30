"use client";

import { AlertTriangle } from "lucide-react";

export default function OrganizationsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F7FA] p-6">
      <div
        role="alert"
        className="w-full max-w-lg rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-sm"
      >
        <AlertTriangle
          aria-hidden="true"
          className="mx-auto h-10 w-10 text-rose-600"
        />
        <h1 className="mt-5 text-2xl font-black text-[#071526]">
          Organization management is unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page encountered an unexpected error. Try loading it again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-[#0F2747] px-5 py-3 text-sm font-black text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
