"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

type Phase = "initialization" | "sign-in-ui" | "dashboard-redirect";

// This timer reports a failure; it never treats a timeout as authentication.
export default function PortalAuthLoading({ phase }: { phase: Phase }) {
  const clerk = useClerk();
  const [timedOut, setTimedOut] = useState(false);
  const unavailable = clerk.status === "error" || clerk.status === "degraded";
  const failed = timedOut || unavailable;

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 15_000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!failed) return;
    // Deliberately exclude keys, cookies, user details, URLs and query strings.
    console.warn("[scholar-portal] Authentication unavailable", {
      phase,
      reason: unavailable ? "clerk-unavailable" : "timeout",
      status: clerk.status,
      online: navigator.onLine,
      hostname: window.location.hostname,
    });
  }, [failed, unavailable, clerk.status, phase]);

  return (
    <div
      className="mx-auto max-w-md p-6 text-center"
      role={failed ? "alert" : "status"}
    >
      {failed ? (
        <>
          <h2 className="text-xl font-bold">Secure sign-in is unavailable</h2>
          <p className="mt-3 text-sm">
            {phase === "dashboard-redirect"
              ? "We could not open your dashboard. Try reloading this page."
              : "The secure sign-in service did not finish loading. Check your connection and try again."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-[#C8A24A] px-5 py-3 font-bold text-[#071526]"
          >
            Reload page
          </button>
          <p className="mt-4 text-sm">
            <a
              className="underline"
              href="mailto:support@globalscholarspathway.com"
            >
              Contact support
            </a>
            {" · "}
            <Link className="underline" href="/">
              Return to main website
            </Link>
          </p>
          <p className="mt-3 text-xs">Support reference: portal-{phase}</p>
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-current/20 border-t-[#C8A24A]"
          />
          <p className="mt-4 font-bold">
            {phase === "dashboard-redirect"
              ? "Opening Scholar Dashboard…"
              : "Loading secure sign-in…"}
          </p>
        </>
      )}
    </div>
  );
}
