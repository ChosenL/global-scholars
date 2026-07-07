import Image from "next/image";
import FadeIn from "../ui/FadeIn";
import {
  BookOpen,
  Heart,
  ShieldCheck,
  Star,
  Users,
  GraduationCap,
  Globe2,
  Quote,
} from "lucide-react";

const timeline = [
  {
    year: "2015",
    title: "The Dream Began",
    text: "Dwayne began his higher education journey at the Vocational Training Development Institute in Jamaica, pursuing a Bachelor’s Degree in Information and Communication Technology while carrying a dream of one day studying abroad.",
  },
  {
    year: "2020",
    title: "A Foundation Built",
    text: "Dwayne completed his Bachelor’s Degree in Information and Communication Technology. Although his dream of studying abroad had not yet become a reality, his passion for international education never faded.",
  },
  {
    year: "2022",
    title: "Britney Begins Her Journey",
    text: "Britney enrolled at the University of the Commonwealth Caribbean in Jamaica. She was committed to earning her degree, but she and Dwayne believed there were greater opportunities available through an international educational experience.",
  },
  {
    year: "2024",
    title: "Marriage & A New Vision",
    text: "After getting married, Dwayne and Britney made the life-changing decision to continue Britney’s education in the United States. Together, they researched universities, transfer requirements, accreditation, programs, documents, and deadlines.",
  },
  {
    year: "2024",
    title: "The Transfer",
    text: "Britney successfully transferred from the University of the Commonwealth Caribbean to Western Connecticut State University. Because of careful planning, many of her credits transferred successfully, allowing her to continue forward instead of starting over.",
  },
  {
    year: "2026",
    title: "A Dream Realized",
    text: "Britney graduated with honors from Western Connecticut State University with a Bachelor’s Degree in Management, concentrating in Human Resource Management, while also gaining valuable professional experience in Human Resources.",
  },
  {
    year: "Today",
    title: "Global Scholars Was Born",
    text: "Our personal journey became our purpose. Global Scholars Pathway Advisors was founded to help students and families navigate international education with clarity, confidence, and genuine support.",
  },
];

const values = [
  ["Integrity", ShieldCheck],
  ["Excellence", Star],
  ["Compassion", Heart],
  ["Empowerment", GraduationCap],
  ["Partnership", Users],
  ["Growth", BookOpen],
];

const testimonials = [
  {
    name: "Britney Thompson",
    role: "Honors Graduate, Western Connecticut State University",
    quote:
      "Transferring internationally can feel overwhelming, but with research, planning, and support, I was able to continue my education in the United States, transfer credits successfully, graduate with honors, and gain professional experience in Human Resources.",
  },
  {
    name: "Student Testimonial",
    role: "Student Guidance Experience",
    quote:
      "The guidance made the process easier to understand. Instead of feeling confused about the next step, I had more clarity, direction, and confidence about moving forward with my educational goals.",
  },
];

export default function About() {
  return (
    <section id="about" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn>
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              Our Story
            </p>

            <h2 className="mt-4 text-5xl font-black leading-tight text-[#0F2747] md:text-6xl">
              Our Story Didn’t End at Graduation. It Began There.
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Global Scholars Pathway Advisors was born from our own journey —
              from Jamaica, through uncertainty, research, faith, transfer
              planning, graduation, and the desire to help future students walk
              the road with greater confidence.
            </p>
          </div>
        </FadeIn>

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
          <FadeIn>
            <div className="relative overflow-hidden rounded-[2rem] shadow-2xl">
              <Image
                src="/founders.jpg"
                alt="Dwayne and Britney Thompson"
                width={800}
                height={1000}
                className="h-full w-full object-cover transition duration-700 hover:scale-105"
              />
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#C8A24A]">
                Why We Started
              </p>

              <h3 className="mt-4 text-4xl font-black leading-tight text-[#0F2747]">
                We understand the journey because we lived it.
              </h3>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                Dwayne always carried the dream of international education, but
                like many students, he did not have the personalized guidance
                needed to make that path clear.
              </p>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                Britney began her studies at the University of the Commonwealth
                Caribbean in Jamaica. Together, after marriage, research,
                applications, transfer planning, and relocation, she completed
                her degree in the United States with honors.
              </p>

              <div className="mt-8 rounded-3xl border-l-4 border-[#C8A24A] bg-[#F8F9FB] p-8">
                <p className="text-2xl font-bold leading-relaxed text-[#0F2747]">
                  “Students don’t simply need information. They need guidance,
                  encouragement, and someone who understands the road.”
                </p>

                <p className="mt-5 font-semibold text-[#C8A24A]">
                  — Dwayne & Britney Thompson
                </p>
              </div>
            </div>
          </FadeIn>
        </div>

        <div className="mt-24">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
                Story Progression
              </p>

              <h3 className="mt-4 text-4xl font-black text-[#0F2747] md:text-5xl">
                The Path That Shaped Our Purpose.
              </h3>
            </div>
          </FadeIn>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {timeline.map((item, index) => (
              <FadeIn key={`${item.year}-${item.title}`} delay={index * 0.05}>
                <div
                  className={`h-full rounded-3xl border border-slate-200 bg-[#F8F9FB] p-7 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl ${
                    index === 6 ? "lg:col-start-2" : ""
                  }`}
                >
                  <p className="text-sm font-black text-[#C8A24A]">
                    {item.year}
                  </p>

                  <h4 className="mt-3 text-2xl font-black text-[#0F2747]">
                    {item.title}
                  </h4>

                  <p className="mt-4 leading-7 text-slate-600">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        <div className="mt-24 rounded-[2rem] bg-[#071526] px-8 py-16 text-center text-white">
          <Globe2 className="mx-auto text-[#C8A24A]" size={46} />

          <h3 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight md:text-5xl">
            Students don’t just need information.
          </h3>

          <p className="mx-auto mt-6 max-w-3xl text-2xl font-bold leading-9 text-[#C8A24A]">
            They need someone who has walked the road before them.
          </p>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-white/75">
            That is why Global Scholars exists — to help students and families
            move forward with clarity, confidence, and genuine support.
          </p>
        </div>

        <div className="mt-24">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
                Mission, Vision & Values
              </p>

              <h3 className="mt-4 text-4xl font-black text-[#0F2747] md:text-5xl">
                What Guides Global Scholars.
              </h3>
            </div>
          </FadeIn>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-[#0F2747] p-8 text-white">
              <h4 className="text-3xl font-black">Our Mission</h4>
              <p className="mt-5 text-lg leading-8 text-white/75">
                To empower students and families through personalized
                educational guidance, helping them confidently navigate
                university admissions, credential evaluations, transfer
                planning, career readiness, and international education.
              </p>
            </div>

            <div className="rounded-3xl bg-[#C8A24A] p-8 text-[#071526]">
              <h4 className="text-3xl font-black">Our Vision</h4>
              <p className="mt-5 text-lg leading-8">
                To become one of the most trusted education advisory
                organizations, connecting students with life-changing
                opportunities while building a platform that supports their
                academic and professional journey.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map(([label, Icon]) => {
              const ValueIcon = Icon as typeof ShieldCheck;

              return (
                <div
                  key={label as string}
                  className="rounded-3xl border border-slate-200 bg-[#F8F9FB] p-8 transition hover:-translate-y-2 hover:shadow-xl"
                >
                  <ValueIcon className="text-[#C8A24A]" size={34} />
                  <h4 className="mt-5 text-2xl font-black text-[#0F2747]">
                    {label as string}
                  </h4>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-24 rounded-[2rem] bg-[#071526] px-8 py-20 text-center text-white">
          <div className="relative mx-auto max-w-3xl">
            <h3 className="text-5xl font-black leading-tight">
              Your Journey Starts Here.
            </h3>

            <p className="mx-auto mt-6 max-w-2xl text-xl leading-9 text-white/80">
              You do not have to navigate the process alone. Let’s build your
              pathway together.
            </p>

            <a
              href="https://calendly.com/thompsondwayne0055/free-10_minute-consultation"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-flex items-center justify-center rounded-xl bg-[#C8A24A] px-8 py-4 font-bold text-[#071526] transition hover:scale-105"
            >
              Book Your Free Consultation
            </a>
          </div>
        </div>

        <div className="mt-24">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
                Testimonials
              </p>

              <h3 className="mt-4 text-4xl font-black text-[#0F2747] md:text-5xl">
                Real Stories. Real Encouragement.
              </h3>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                These stories reflect the heart of Global Scholars — helping
                students and families move forward with clarity and confidence.
              </p>
            </div>
          </FadeIn>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {testimonials.map((item, index) => (
              <FadeIn key={item.name} delay={index * 0.08}>
                <div className="h-full rounded-3xl border border-slate-200 bg-[#F8F9FB] p-8 shadow-sm">
                  <Quote className="text-[#C8A24A]" size={38} />

                  <p className="mt-6 text-lg leading-8 text-slate-700">
                    “{item.quote}”
                  </p>

                  <div className="mt-8 border-t border-slate-200 pt-6">
                    <p className="text-xl font-black text-[#0F2747]">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#C8A24A]">
                      {item.role}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}