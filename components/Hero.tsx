export default function Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2">
        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[#C8A24A]">
            Guiding Dreams. Building Futures.
          </p>

          <h1 className="text-5xl font-bold leading-tight text-[#0F2747] md:text-6xl">
            Every Dream Deserves a Pathway.
          </h1>

          <p className="mt-6 text-lg leading-8 text-[#2D3748]">
            Global Scholars Pathway Advisors helps students and families
            confidently navigate the journey to studying in the United States —
            from planning and admissions to graduation and career readiness.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href="#"
              className="rounded-xl bg-[#0F2747] px-7 py-4 text-center font-bold text-white"
            >
              Book Your Pathway Consultation
            </a>

            <a
              href="#"
              className="rounded-xl border border-[#0F2747] px-7 py-4 text-center font-bold text-[#0F2747]"
            >
              Explore Your Journey
            </a>
          </div>
        </div>

        <div className="rounded-3xl bg-[#F8F9FB] p-8">
          <div className="rounded-2xl bg-[#0F2747] p-8 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#C8A24A]">
              Jamaica → USA
            </p>

            <h2 className="mt-4 text-3xl font-bold leading-tight">
              A trusted pathway from possibility to purpose.
            </h2>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-2xl font-bold text-[#C8A24A]">01</p>
                <p className="mt-2 text-sm">Personalized Guidance</p>
              </div>

              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-2xl font-bold text-[#C8A24A]">02</p>
                <p className="mt-2 text-sm">Clear Planning</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}