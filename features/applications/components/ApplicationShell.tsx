import { ChevronLeft, ClipboardList } from "lucide-react";
import Link from "next/link";

export default function ApplicationShell({
  children,
  title,
  description,
  backHref,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F4F7FA] text-[#071526]">
      <header className="bg-[#071526] text-white">
        <div className="mx-auto flex max-w-7xl items-center px-5 py-5 md:px-8">
          <Link
            href="/applications"
            className="flex items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:ring-[#C8A24A]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C8A24A] text-[#071526]">
              <ClipboardList aria-hidden="true" className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-black text-[#C8A24A]">
                Global Scholars
              </span>
              <span className="block text-xs text-white/60">
                Application Management
              </span>
            </span>
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        ) : null}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A6812C]">
              Admissions pipeline
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
          {actions}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
