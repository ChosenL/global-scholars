const stories = [
  {
    quote:
      "Global Scholars helped me believe in myself and guided me every step of the way.",
    name: "Janelle R.",
    school: "Western Connecticut State University",
  },
  {
    quote:
      "Their guidance helped me transfer smoothly and find the right path for my career goals.",
    name: "Kevin S.",
    school: "University of Connecticut",
  },
  {
    quote:
      "From my first call to my first day on campus, they were always there for me.",
    name: "Tatiana M.",
    school: "Pace University",
  },
];

export default function SuccessStories() {
  return (
    <section className="bg-[#0F2747] px-6 py-20 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-[#C8A24A]">
          Success Stories
        </p>

        <h2 className="mt-3 text-center text-4xl font-bold">
          Real Students. Real Dreams. Real Futures.
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {stories.map((story) => (
            <div key={story.name} className="rounded-2xl bg-white p-6 text-[#0F2747]">
              <p className="text-sm leading-7">“{story.quote}”</p>
              <p className="mt-6 font-bold">— {story.name}</p>
              <p className="text-sm text-[#2D3748]">{story.school}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}