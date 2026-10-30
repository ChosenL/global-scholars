import Image from "next/image";
import FadeIn from "../ui/FadeIn";

import { CheckCircle2, GraduationCap, Globe2, Users } from "lucide-react";

const calendlyLink =
  "https://calendly.com/thompsondwayne0055/free-10_minute-consultation";

const trustPoints = [
  {
    label: "Personalized Guidance",
    icon: Users,
  },
  {
    label: "Trusted Advisors",
    icon: CheckCircle2,
  },
  {
    label: "Caribbean to USA",
    icon: Globe2,
  },
];

export default function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-white transition-colors duration-300 dark:bg-[#0b1323]"
    >
      {/* DECORATIVE BACKGROUND GLOW */}

      <div
        aria-hidden="true"
        className="gsp-decorative-glow pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-[#C8A24A]/10 blur-3xl dark:bg-cyan-500/10"
      />

      <div
        aria-hidden="true"
        className="gsp-decorative-glow pointer-events-none absolute right-0 top-24 h-96 w-96 rounded-full bg-[#0F2747]/10 blur-3xl dark:bg-blue-500/10"
      />

      {/* MAIN HERO LAYOUT */}

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:py-28">
        {/* LEFT COLUMN */}

        <FadeIn>
          <div>
            {/* BRAND BADGE */}

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C8A24A]/30 bg-[#C8A24A]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-[#8A6A1F] dark:border-[#C8A24A]/40 dark:bg-[#C8A24A]/10 dark:text-[#E4C577]">
              <GraduationCap size={16} className="shrink-0" />
              Guiding Dreams. Building Futures.
            </div>

            {/* MAIN HEADING */}

            <h1 className="max-w-2xl text-5xl font-black leading-tight text-[#0F2747] transition-colors md:text-7xl dark:text-[#F1F6FC]">
              Every Dream Deserves a Pathway.
            </h1>

            {/* DESCRIPTION */}

            <p className="mt-7 max-w-xl text-lg leading-8 text-[#2D3748] transition-colors dark:text-slate-300">
              Global Scholars Pathway Advisors helps students and families
              confidently navigate university admissions, credential evaluation,
              transfer planning, career readiness, and the journey to studying
              in the United States.
            </p>

            {/* ACTION BUTTONS */}

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              {/* BOOK CONSULTATION */}

              <a
                href={calendlyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="gsp-glow inline-flex items-center justify-center rounded-xl bg-[#0F2747] px-7 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-[#173A68] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A24A] dark:bg-[#17659A] dark:hover:bg-[#207BB6]"
              >
                Book Consultation
              </a>

              {/* EXPLORE SERVICES */}

              <a
                href="#services"
                className="gsp-glow inline-flex items-center justify-center rounded-xl border border-[#0F2747] px-7 py-4 text-center text-sm font-bold text-[#0F2747] transition-colors hover:bg-[#0F2747]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A24A] dark:border-slate-500 dark:text-slate-100 dark:hover:border-cyan-400 dark:hover:bg-slate-800"
              >
                Explore Your Journey
              </a>
            </div>

            {/* TRUST POINTS */}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {trustPoints.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="gsp-glow flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[#C8A24A]/60 dark:border-slate-700 dark:bg-[#131f32] dark:hover:border-cyan-500/50"
                  >
                    {/* ICON */}

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F2747] dark:bg-[#223b59]">
                      <Icon
                        size={20}
                        className="text-[#C8A24A] dark:text-[#E4C577]"
                      />
                    </div>

                    {/* LABEL */}

                    <p className="text-sm font-bold text-[#0F2747] transition-colors dark:text-slate-100">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* RIGHT COLUMN — HERO IMAGE */}

        <FadeIn delay={0.2}>
          <div className="relative">
            {/* GOLD DECORATIVE CIRCLE */}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#C8A24A] dark:bg-[#C8A24A]/80"
            />

            {/* NAVY DECORATIVE CIRCLE */}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 right-10 h-20 w-20 rounded-full bg-[#0F2747] dark:bg-[#17659A]"
            />

            {/* HERO IMAGE CONTAINER */}

            <div className="relative h-[360px] overflow-hidden rounded-[2rem] bg-[#EAF1F8] shadow-2xl sm:h-[440px] lg:h-[500px] dark:bg-[#16243a] dark:shadow-black/40">
              <Image
                src="/hero.png"
                alt="Graduates looking toward a city skyline"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
