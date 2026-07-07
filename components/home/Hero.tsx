import Image from "next/image";
import FadeIn from "../ui/FadeIn";
import HeroStats from "./HeroStats";
import {
  CheckCircle2,
  GraduationCap,
  Globe2,
  Users,
} from "lucide-react";

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
    label: "Jamaica to USA",
    icon: Globe2,
  },
];

export default function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-white">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#C8A24A]/10 blur-3xl" />
      <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-[#0F2747]/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <FadeIn>
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C8A24A]/30 bg-[#C8A24A]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-[#8A6A1F]">
              <GraduationCap size={16} />
              Guiding Dreams. Building Futures.
            </div>

            <h1 className="max-w-2xl text-5xl font-black leading-tight text-[#0F2747] md:text-7xl">
              Every Dream Deserves a Pathway.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-[#2D3748]">
              Global Scholars Pathway Advisors helps students and families
              confidently navigate university admissions, credential evaluation,
              transfer planning, career readiness, and the journey to studying
              in the United States.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href={calendlyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-[#0F2747] px-7 py-4 text-center text-sm font-bold text-white transition hover:scale-105"
              >
                Book Consultation
              </a>

              <a
                href="#services"
                className="rounded-xl border border-[#0F2747] px-7 py-4 text-center text-sm font-bold text-[#0F2747] transition hover:scale-105"
              >
                Explore Your Journey
              </a>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {trustPoints.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F2747]">
                      <Icon size={20} className="text-[#C8A24A]" />
                    </div>

                    <p className="text-sm font-bold text-[#0F2747]">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="relative">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#C8A24A]" />
            <div className="absolute -bottom-6 right-10 h-20 w-20 rounded-full bg-[#0F2747]" />

            <div className="relative h-[500px] overflow-hidden rounded-[2rem] bg-[#EAF1F8] shadow-2xl">
              <Image
                src="/hero.png"
                alt="Graduates looking toward a city skyline"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>

            <HeroStats />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}