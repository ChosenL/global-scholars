const steps = [
  "Discover",
  "Design",
  "Prepare",
  "Transition",
  "Thrive",
  "Lead",
];

export default function Pathway() {
  return (
    <section className="bg-[#0F2747] py-20 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-[#C8A24A]">
          The Global Scholars Pathway™
        </p>

        <h2 className="mt-3 text-center text-4xl font-bold">
          A Clear Path. Every Step of the Way.
        </h2>

        <div className="mt-12 grid gap-5 md:grid-cols-6">
          {steps.map((step, index) => (
            <div
              key={step}
              className="rounded-2xl border border-[#C8A24A]/40 bg-white/5 p-5 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#C8A24A] font-bold text-[#0F2747]">
                {index + 1}
              </div>
              <h3 className="font-bold">{step}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}