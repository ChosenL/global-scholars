const cards = [
  {
    title: "Resources for Families",
    text: "Guides, checklists, and tools to help you make informed decisions with confidence.",
    cta: "Explore Resources",
  },
  {
    title: "For Students",
    text: "Practical guidance and support to help you achieve your goals and build your future.",
    cta: "Start Your Journey",
  },
  {
    title: "For University Partners",
    text: "Let's collaborate to create pathways that empower more students together.",
    cta: "Partner With Us",
  },
  {
    title: "For Employers",
    text: "Connecting talented international students with meaningful opportunities.",
    cta: "Learn More",
  },
];

export default function AudienceCards() {
  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="rounded-2xl bg-[#F8F9FB] p-6 shadow-sm">
            <h3 className="text-2xl font-bold text-[#0F2747]">{card.title}</h3>
            <p className="mt-4 text-sm leading-6 text-[#2D3748]">{card.text}</p>
            <a href="#" className="mt-6 inline-block font-bold text-[#0F2747]">
              {card.cta} →
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}