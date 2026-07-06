import FadeIn from "../ui/FadeIn";

const steps = [
  {
    number: "01",
    title: "Discover",
    description: "Understand your goals, strengths, and opportunities.",
  },
  {
    number: "02",
    title: "Design",
    description: "Build a personalized education and career pathway.",
  },
  {
    number: "03",
    title: "Prepare",
    description: "Applications, documents, and interview preparation.",
  },
  {
    number: "04",
    title: "Transition",
    description: "Navigate admissions, visas, and relocation confidently.",
  },
  {
    number: "05",
    title: "Thrive",
    description: "Receive ongoing support while studying abroad.",
  },
  {
    number: "06",
    title: "Lead",
    description: "Graduate prepared to impact your community and career.",
  },
];

export default function Pathway() {
  return (
    <section className="bg-[#0F2747] py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn>
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              The Global Scholars Pathway™
            </p>

            <h2 className="mt-4 text-4xl font-bold md:text-5xl">
              Your Journey Starts Here
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg text-white/75">
              Our proven six-step framework guides every student from their
              first dream to graduation and beyond.
            </p>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => (
            <FadeIn key={step.number} delay={index * 0.1}>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 transition duration-300 hover:-translate-y-2 hover:border-[#C8A24A] hover:bg-white/10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C8A24A] text-2xl font-bold text-[#0F2747]">
                  {step.number}
                </div>

                <h3 className="mt-6 text-2xl font-bold">
                  {step.title}
                </h3>

                <p className="mt-4 leading-7 text-white/75">
                  {step.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}