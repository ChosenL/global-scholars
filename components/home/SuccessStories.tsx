import Image from "next/image";
import FadeIn from "../ui/FadeIn";

const milestones = [
  {
    year: "2015",
    title: "The Dream Began",
    text:
      "Dwayne began studying Information and Communication Technology at the Vocational Training and Development Institute in Jamaica. Even then, he dreamed of studying abroad, but without guidance, the path seemed out of reach.",
    image: "/dwayne-start.jpg",
  },
  {
    year: "2022",
    title: "Britney Begins University",
    text:
      "Britney started pursuing her bachelor's degree at the University of the Commonwealth Caribbean (UCC) in Jamaica. Although grateful for the opportunity, she desired greater global opportunities and a learning environment that would maximize her potential.",
    image: "/britney-ucc.jpg",
  },
  {
    year: "April 2024",
    title: "A New Beginning",
    text:
      "After getting married, we combined our dreams into one mission. Together we researched universities, compared programs, completed applications, organized documents, and prepared for one of the biggest decisions of our lives.",
    image: "/wedding.jpg",
  },
  {
    year: "2024",
    title: "Crossing Borders",
    text:
      "Just weeks after our wedding, we packed everything we owned and moved to the United States so Britney could continue her education. It was exciting, uncertain, and life-changing.",
    image: "/campus-britney.jpg",
  },
  {
    year: "2026",
    title: "Dream Achieved",
    text:
      "Britney graduated with Honors from Western Connecticut State University with a degree in Management, concentrating in Human Resource Management. She also gained valuable professional HR experience while studying.",
    image: "/graduation.jpg",
  },
  {
    year: "Today",
    title: "Helping Others Build Their Future",
    text:
      "Everything we learned through our own journey became the foundation of Global Scholars Pathway Advisors. Today we help students and families navigate the same path with clarity, confidence, and genuine care.",
    image: "/founders.jpg",
  },
];

export default function SuccessStories() {
  return (
    <section
      id="success-stories"
      className="bg-[#F8F9FB] py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              Our Journey
            </p>

            <h2 className="mt-4 text-5xl font-black text-[#0F2747]">
              From Our Story...
              <br />
              To Yours.
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Global Scholars wasn't created in a boardroom.
              It was created through real experiences,
              real obstacles, and a dream that became our mission.
            </p>
          </div>
        </FadeIn>

        <div className="mt-20 space-y-20">
          {milestones.map((item, index) => (
            <FadeIn key={item.year} delay={index * 0.08}>
              <div
                className={`grid items-center gap-10 lg:grid-cols-2 ${
                  index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="inline-flex rounded-full bg-[#C8A24A] px-5 py-2 text-sm font-bold text-white">
                    {item.year}
                  </div>

                  <h3 className="mt-5 text-3xl font-black text-[#0F2747]">
                    {item.title}
                  </h3>

                  <p className="mt-5 text-lg leading-8 text-slate-600">
                    {item.text}
                  </p>
                </div>

                <div className="overflow-hidden rounded-[30px] shadow-2xl">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={700}
                    height={500}
                    className="h-full w-full object-cover transition duration-700 hover:scale-105"
                  />
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}