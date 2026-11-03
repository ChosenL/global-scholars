"use client";

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";

type Phase = "initialization" | "sign-in-ui" | "dashboard-redirect";

// This timer reports a failure; it never treats a timeout as authentication.
export default function PortalAuthLoading({
  phase,
  expired = false,
  loadingOnly = false,
}: {
  phase: Phase;
  expired?: boolean;
  loadingOnly?: boolean;
}) {
  const clerk = useClerk();
  const [timedOut, setTimedOut] = useState(false);
  const unavailable = clerk.status === "error" || clerk.status === "degraded";
  const failed = !loadingOnly && (expired || timedOut || unavailable);

  useEffect(() => {
    if (loadingOnly) return;
    const timer = window.setTimeout(() => setTimedOut(true), 15_000);
    return () => window.clearTimeout(timer);
  }, [loadingOnly]);

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

// SignIn's fallback ends when it has children, which may still be a spinner.
// These markers are assigned through Clerk's supported appearance.elements API
// in page.tsx, rather than depending on Clerk's private classes/DOM structure.
const AUTH_CONTROLS = ".portal-auth-field, .portal-auth-action";

function visible(element: HTMLElement): boolean {
  if (
    !Array.from(element.getClientRects()).some(
      (rect) => rect.width > 0 && rect.height > 0,
    )
  )
    return false;
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    const style = getComputedStyle(node);
    if (
      node.hidden ||
      node.inert ||
      node.getAttribute("aria-hidden") === "true" ||
      style.display === "none" ||
      style.visibility !== "visible" ||
      Number(style.opacity) === 0
    )
      return false;
  }
  return true;
}

function usable(element: HTMLElement): boolean {
  if (
    !element.matches("input, button") ||
    !visible(element) ||
    element.matches(":disabled") ||
    element.closest('[aria-disabled="true"]')
  )
    return false;
  if (
    element instanceof HTMLInputElement &&
    (element.type === "hidden" || element.readOnly)
  )
    return false;
  // Check accessible naming, never credential values. Labels may live outside
  // the input wrapper (aria-labelledby and native label associations).
  return Boolean(
    element.getAttribute("aria-label")?.trim() ||
    element
      .getAttribute("aria-labelledby")
      ?.split(/\s+/)
      .some((id) => document.getElementById(id)?.textContent?.trim()) ||
    (element instanceof HTMLInputElement
      ? Array.from(element.labels ?? []).some((label) =>
          label.textContent?.trim(),
        )
      : element.textContent?.trim()),
  );
}

export function PortalSignInWatchdog({ children }: { children: ReactNode }) {
  const surface = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const [stalled, setStalled] = useState(false);
  const { signIn, fetchStatus: signInFetch } = useSignIn();
  const { signUp, fetchStatus: signUpFetch } = useSignUp();
  const active =
    Boolean(signIn.status || signUp.status) ||
    signInFetch === "fetching" ||
    signUpFetch === "fetching";

  useEffect(() => {
    const root = surface.current;
    if (!root || finished.current) return;
    const events = [
      "focusin",
      "pointerdown",
      "keydown",
      "input",
      "change",
      "submit",
    ];
    const stop = () => {
      observer.disconnect();
      window.clearInterval(poll);
      window.clearTimeout(deadline);
      events.forEach((event) =>
        root.removeEventListener(event, interaction, true),
      );
      window.removeEventListener("hashchange", inspect);
    };
    const finish = () => {
      finished.current = true;
      stop();
      setStalled(false);
    };
    // Resumed verification/MFA/OAuth routes are not initial sign-in loading.
    // Inspect only the route and parameter names, never invitation/token values.
    const initialRoute = () => {
      const [route, query = ""] = window.location.hash.slice(1).split("?");
      const names = new URLSearchParams(window.location.search);
      const hashNames = new URLSearchParams(query);
      return (
        (!route || route === "/") &&
        !["__clerk_ticket", "__clerk_status", "code", "state"].some(
          (name) => names.has(name) || hashNames.has(name),
        )
      );
    };
    const inspect = () => {
      if (
        active ||
        !initialRoute() ||
        Array.from(root.querySelectorAll<HTMLElement>(AUTH_CONTROLS)).some(
          usable,
        )
      )
        finish();
    };
    const interaction = (event: Event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(AUTH_CONTROLS)
          : null;
      if (event.type === "submit" || (target && usable(target))) finish();
    };
    const observer = new MutationObserver(inspect);
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        "class",
        "style",
        "hidden",
        "inert",
        "disabled",
        "readonly",
        "aria-disabled",
        "aria-hidden",
        "aria-label",
        "aria-labelledby",
      ],
    });
    // CSS animations/stylesheet changes can expose controls without DOM mutations.
    const poll = window.setInterval(inspect, 250);
    const deadline = window.setTimeout(() => {
      inspect();
      if (!finished.current) setStalled(true);
    }, 15_000);
    events.forEach((event) => root.addEventListener(event, interaction, true));
    window.addEventListener("hashchange", inspect);
    inspect();
    return stop;
  }, [active]);

  return (
    <div className="w-full">
      <div ref={surface}>{children}</div>
      {/* A sibling: never replace, disable, conceal or remount Clerk's UI. */}
      {stalled && !active && <PortalAuthLoading phase="sign-in-ui" expired />}
    </div>
  );
}
