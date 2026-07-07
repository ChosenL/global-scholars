import Image from "next/image";
import Link from "next/link";
import FadeIn from "../ui/FadeIn";
import {
  ArrowRight,
  BookOpen,
  Heart,
  ShieldCheck,
  Star,
  Users,
  GraduationCap,
  Globe2,
} from "lucide-react";

const timeline = [
  {
    year: "2015",
    title: "The Dream Began",
    text: "Dwayne began college in Jamaica at the Vocational Training Development Institute while carrying a desire for international education.",
  },
  {
    year: "2020",
    title: "A Degree Completed",
    text: "He completed his Bachelor’s Degree in Information and Communication Technology.",
  },
  {
    year: "2024",
    title: "A Shared Journey",
    text: "Dwayne and Britney were married and began planning Britney’s transfer journey to the United States.",
  },
  {
    year: "2024",
    title: "Research, Applications & Faith",
    text: "Together, they researched universities, transfer credits, documents, timelines, and the steps needed to move forward.",
  },
  {
    year: "2026",
    title: "Graduation With Honors",
    text: "Britney graduated with honors after successfully transferring credits and completing her degree in the United States.",
  },
  {
    year: "Today",
    title: "Global Scholars Was Born",
    text: "Their personal journey became the mission behind Global Scholars Pathway Advisors.",
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
              A Journey That Became a Mission.
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

        <div className="mt-24 grid gap-8 lg:grid-cols-2">
          <FadeIn>
            <div className="overflow-hidden rounded-[2rem] shadow-xl">
              <Image
                src="/wedding.jpg"
                alt="Dwayne and Britney wedding"
                width={800}
                height={1000}
                className="h-full w-full object-cover"
              />
            </div>
          </FadeIn>

          <div className="space-y-5">
            {timeline.map((item, index) => (
              <FadeIn key={`${item.year}-${item.title}`} delay={index * 0.05}>
                <div className="rounded-3xl border border-slate-200 bg-[#F8F9FB] p-6">
                  <p className="text-sm font-black text-[#C8A24A]">
                    {item.year}
                  </p>
                  <h4 className="mt-2 text-xl font-black text-[#0F2747]">
                    {item.title}
                  </h4>
                  <p className="mt-2 leading-7 text-slate-600">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        <div className="mt-24 grid items-center gap-12 rounded-[2rem] bg-[#F8F9FB] p-8 lg:grid-cols-2 lg:p-12">
          <FadeIn>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#C8A24A]">
                Britney’s Journey
              </p>

              <h3 className="mt-4 text-4xl font-black text-[#0F2747]">
                From transfer student to honors graduate.
              </h3>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                Through careful planning and persistence, Britney successfully
                transferred the majority of her credits and completed her degree
                in two years instead of starting over.
              </p>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                Her journey reminds future students that with preparation,
                guidance, and perseverance, what feels overwhelming can become
                achievable.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="grid gap-6 sm:grid-cols-2">
              <Image
                src="/campus-britney.jpg"
                alt="Britney on campus"
                width={500}
                height={700}
                className="rounded-3xl object-cover shadow-xl"
              />

              <Image
                src="/graduation.jpg"
                alt="Britney graduation"
                width={500}
                height={700}
                className="rounded-3xl object-cover shadow-xl sm:mt-10"
              />
            </div>
          </FadeIn>
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

        <div className="relative mt-24 overflow-hidden rounded-[2rem] bg-[#071526] px-8 py-20 text-center text-white">
          <Image
            src="/founders-stairs.jpg"
            alt="Dwayne and Britney"
            fill
            className="object-cover opacity-25"
          />

          <div className="absolute inset-0 bg-[#071526]/70" />

          <div className="relative mx-auto max-w-3xl">
            <h3 className="text-5xl font-black leading-tight">
              Your Journey Starts Here.
            </h3>

            <p className="mx-auto mt-6 max-w-2xl text-xl leading-9 text-white/80">
              You do not have to navigate the process alone. Let’s build your
              pathway together.
            </p>

            <Link
              href="#contact"
              className="mt-10 inline-flex items-center gap-3 rounded-xl bg-[#C8A24A] px-8 py-4 font-bold text-[#071526] transition hover:scale-105"
            >
              Book Your Free Consultation
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}