import Link from "next/link";

const cards = [
  {
    title: "Resources for Families",
    text: "Guides, checklists, and tools to help you make informed decisions with confidence.",
    cta: "Explore Resources",
    href: "/resources",
  },
  {
    title: "For Students",
    text: "Practical guidance and support to help you achieve your goals and build your future.",
    cta: "Start Your Journey",
    href: "/student-portal",
  },
  {
    title: "For University Partners",
    text: "Let's collaborate to create pathways that empower more students together.",
    cta: "Partner With Us",
    href: "/contact",
  },
  {
    title: "For Employers",
    text: "Connecting talented international students with meaningful opportunities.",
    cta: "Learn More",
    href: "/services",
  },
];

export default function AudienceCards() {
  return (
    <section className="bg-white px-6 py-16 dark:bg-[#0b1323]">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="gsp-glow flex h-full flex-col rounded-2xl border border-slate-200 bg-[#F8F9FB] p-6 shadow-sm transition-colors hover:border-[#C8A24A]/60 dark:border-slate-700 dark:bg-[#131f32] dark:hover:border-cyan-400/50"
          >
            <h3 className="text-2xl font-bold text-[#0F2747] dark:text-[#F1F6FC]">
              {card.title}
            </h3>
            <p className="mt-4 text-sm leading-6 text-[#2D3748] dark:text-slate-300">
              {card.text}
            </p>
            <Link
              href={card.href}
              className="mt-auto inline-block pt-6 font-bold text-[#0F2747] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8A24A] dark:text-[#E4C577]"
            >
              {card.cta} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
