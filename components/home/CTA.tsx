export default function CTA() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-3xl bg-[#0F2747] p-10 text-white md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#C8A24A]">
            Start Your Journey
          </p>
          <h2 className="mt-3 text-4xl font-bold">
            Ready to build your pathway?
          </h2>
          <p className="mt-4 max-w-2xl text-white/80">
            Book a personalized consultation and let’s discuss your goals,
            questions, and next steps.
          </p>
        </div>

        <a
          href="#"
          className="rounded-xl bg-white px-7 py-4 font-bold text-[#0F2747]"
        >
          Book Consultation
        </a>
      </div>
    </section>
  );
}