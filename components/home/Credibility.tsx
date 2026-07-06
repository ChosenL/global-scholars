"use client";

import { useEffect, useState } from "react";
import FadeIn from "../ui/FadeIn";

const stats = [
  { number: 1, suffix: "+", label: "Graduation journey completed firsthand" },
  { number: 2, suffix: "+", label: "Student success stories beginning" },
  { number: 10, suffix: " min", label: "Free consultation to get started" },
];

const universities = [
  "Western Connecticut State University",
  "University of Connecticut",
  "Southern Connecticut State University",
  "Pace University",
];

function CountUp({
  end,
  suffix,
}: {
  end: number;
  suffix: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let current = 0;
    const increment = Math.max(1, Math.ceil(end / 40));

    const timer = setInterval(() => {
      current += increment;

      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [end]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

export default function Credibility() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn>
          <div className="grid gap-6 md:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-slate-200 bg-[#F8F9FB] p-8 text-center shadow-sm"
              >
                <h3 className="text-5xl font-black text-[#0F2747]">
                  <CountUp end={stat.number} suffix={stat.suffix} />
                </h3>
                <p className="mt-4 font-semibold leading-7 text-slate-600">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-16 rounded-3xl bg-[#0F2747] px-8 py-10 text-white">
            <p className="text-center text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              Institutions Connected to the Journey
            </p>

            <div className="mt-8 grid gap-4 text-center md:grid-cols-4">
              {universities.map((school) => (
                <div
                  key={school}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 font-semibold text-white/85"
                >
                  {school}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}