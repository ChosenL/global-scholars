import Image from "next/image";
import FadeIn from "../ui/FadeIn";

export default function Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
        <FadeIn>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#C8A24A]">
              Guiding Dreams. Building Futures.
            </p>

            <h1 className="mt-5 text-5xl font-bold leading-tight text-[#0F2747] md:text-6xl">
              Every Dream <br />
              Deserves a <br />
              Pathway.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[#2D3748]">
              Global Scholars Pathway Advisors helps students and families
              confidently navigate university admissions, scholarships, visas,
              and career opportunities.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="#"
                className="rounded-xl bg-[#0F2747] px-7 py-4 text-center text-sm font-bold text-white transition hover:scale-105"
              >
                Book Consultation
              </a>

              <a
                href="#"
                className="rounded-xl border border-[#0F2747] px-7 py-4 text-center text-sm font-bold text-[#0F2747] transition hover:scale-105"
              >
                Explore Your Journey
              </a>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="relative h-[420px] overflow-hidden rounded-3xl bg-[#EAF1F8] shadow-sm">
            <Image
              src="/hero.png"
              alt="Graduates looking toward a city skyline"
              fill
              className="object-cover"
              priority
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}