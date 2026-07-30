"use client";

import { CheckCircle2, XCircle } from "lucide-react";

export default function ApplicationToast({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "error";
}) {
  const Icon = tone === "success" ? CheckCircle2 : XCircle;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold shadow-2xl"
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      {message}
    </div>
  );
}
