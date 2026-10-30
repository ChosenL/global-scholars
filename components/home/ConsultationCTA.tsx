import FadeIn from "../ui/FadeIn";

import { Calendar, Mail, CheckCircle2, ArrowRight } from "lucide-react";

const departmentEmails = [
  {
    label: "General Information",
    email: "info@globalscholarspathway.com",
  },
  {
    label: "Admissions",
    email: "admissions@globalscholarspathway.com",
  },
  {
    label: "Partnerships",
    email: "partners@globalscholarspathway.com",
  },
  {
    label: "Student Support",
    email: "support@globalscholarspathway.com",
  },
];

export default function ConsultationCTA() {
  return (
    <section id="contact" className="relative overflow-hidden py-24">
      {/* BACKGROUND GRADIENT */}

      <div className="absolute inset-0 bg-gradient-to-br from-[#071526] via-[#0F2747] to-[#173A68]" />

      {/* SUBTLE DECORATIVE GLOWS */}

      <div
        aria-hidden="true"
        className="gsp-decorative-glow pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-[#C8A24A]/20 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="gsp-decorative-glow pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <FadeIn>
          <div className="grid items-center gap-10 rounded-[2rem] border border-white/10 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-md sm:p-8 lg:grid-cols-[1.3fr_0.7fr] lg:p-12">
            {/* LEFT SIDE — CONSULTATION INFORMATION */}

            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#C8A24A]/20 px-5 py-2 text-sm font-bold text-[#F5D77A]">
                <Calendar size={18} className="shrink-0" />
                Free 10-Minute Online Consultation
              </div>

              <h2 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                Ready to begin your pathway?
              </h2>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
                Start with a short consultation where we learn your goals,
                explain the process, and help you understand your next best
                step.
              </p>

              {/* CONSULTATION BENEFITS */}

              <div className="mt-8 grid gap-4 text-sm font-semibold text-white/85 sm:grid-cols-3">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="shrink-0 text-[#C8A24A]" />
                  Online only
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="shrink-0 text-[#C8A24A]" />
                  Caribbean to USA
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="shrink-0 text-[#C8A24A]" />
                  Flexible scheduling
                </span>
              </div>
            </div>

            {/* RIGHT SIDE — CONTACT CARD */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-[#0F2747] shadow-xl transition-colors dark:border-slate-700 dark:bg-[#101c30] dark:text-white">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#9A7425] dark:text-[#E4C577]">
                Contact Our Team
              </p>

              <h3 className="mt-3 text-2xl font-black">How Can We Help?</h3>

              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Select the department that best matches your inquiry.
              </p>

              {/* DEPARTMENT EMAILS */}

              <div className="mt-6 space-y-3">
                {departmentEmails.map((department) => (
                  <a
                    key={department.email}
                    href={`mailto:${department.email}`}
                    className="gsp-glow group flex items-start gap-3 rounded-2xl border border-slate-200 bg-[#F8F9FB] p-4 transition-colors hover:border-[#C8A24A] hover:bg-[#EEF3F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A24A] dark:border-slate-700 dark:bg-[#16243a] dark:hover:border-cyan-500 dark:hover:bg-[#1d304c]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F2747] text-[#C8A24A] dark:bg-[#223b59] dark:text-[#E4C577]">
                      <Mail size={19} />
                    </span>

                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#0F2747] dark:text-white">
                        {department.label}
                      </span>

                      <span className="mt-1 block break-all text-xs text-slate-600 group-hover:text-[#0F2747] sm:text-sm dark:text-slate-300 dark:group-hover:text-white">
                        {department.email}
                      </span>
                    </span>
                  </a>
                ))}
              </div>

              {/* CONSULTATION BUTTON */}

              <a
                href="/contact#contact-form"
                className="gsp-glow mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F2747] px-5 py-4 text-center font-bold text-white transition-colors hover:bg-[#173A68] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A24A] dark:bg-[#17659A] dark:hover:bg-[#207BB6]"
              >
                Request Consultation
                <ArrowRight size={18} className="shrink-0" />
              </a>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
