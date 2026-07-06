import FadeIn from "../ui/FadeIn";
import { Calendar, Phone, CheckCircle2, ArrowRight } from "lucide-react";

export default function ConsultationCTA() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-[#071526] via-[#0F2747] to-[#173A68]" />
      <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-[#C8A24A]/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <FadeIn>
          <div className="grid items-center gap-10 rounded-[2rem] border border-white/10 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-md lg:grid-cols-[1.3fr_0.7fr] lg:p-12">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#C8A24A]/20 px-5 py-2 text-sm font-bold text-[#F5D77A]">
                <Calendar size={18} />
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

              <div className="mt-8 grid gap-3 text-sm font-semibold text-white/85 sm:grid-cols-3">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#C8A24A]" />
                  Online only
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#C8A24A]" />
                  Jamaica → USA
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#C8A24A]" />
                  Flexible scheduling
                </span>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 text-[#0F2747]">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#C8A24A]">
                Contact
              </p>

              <div className="mt-5 space-y-4">
                <a
                  href="tel:7813087146"
                  className="flex items-center gap-3 rounded-2xl bg-[#F8F9FB] p-4 font-bold transition hover:bg-[#EEF3F8]"
                >
                  <Phone size={18} />
                  781-308-7146
                </a>

                <a
                  href="tel:7815799049"
                  className="flex items-center gap-3 rounded-2xl bg-[#F8F9FB] p-4 font-bold transition hover:bg-[#EEF3F8]"
                >
                  <Phone size={18} />
                  781-579-9049
                </a>
              </div>

              <a
                href="#"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F2747] px-6 py-4 font-bold text-white transition hover:scale-105"
              >
                Request Consultation
                <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}