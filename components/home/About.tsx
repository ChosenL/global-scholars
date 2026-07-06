import Image from "next/image";
import FadeIn from "../ui/FadeIn";
import { ArrowRight } from "lucide-react";

export default function About() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">

        {/* Founder Photo */}
        <FadeIn>
          <div className="relative overflow-hidden rounded-[32px] shadow-2xl">
            <Image
              src="/founders.jpg"
              alt="Dwayne and Britney Thompson"
              width={700}
              height={850}
              className="w-full object-cover transition duration-700 hover:scale-105"
            />
          </div>
        </FadeIn>

        {/* Content */}
        <FadeIn delay={0.15}>
          <div>

            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              Meet the Founders
            </p>

            <h2 className="mt-4 text-5xl font-black leading-tight text-[#0F2747]">
              A Journey That Became
              <br />
              a Mission.
            </h2>

            <p className="mt-8 text-lg leading-8 text-slate-600">
              Global Scholars Pathway Advisors was founded by
              <strong> Dwayne and Britney Thompson </strong>
              after personally experiencing the international education
              journey—from researching universities and preparing
              applications to celebrating Britney’s graduation from
              Western Connecticut State University.
            </p>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              We know how overwhelming the process can feel without
              trusted guidance. That experience inspired us to create a
              company dedicated to helping students and families move
              forward with clarity, confidence, and integrity.
            </p>

            <div className="mt-10 rounded-3xl bg-[#F8F9FB] p-8 border-l-4 border-[#C8A24A]">

              <p className="text-2xl font-bold leading-relaxed text-[#0F2747]">
                "We guide every student with the same care,
                dedication, and integrity we would give our
                own family."
              </p>

              <p className="mt-5 font-semibold text-[#C8A24A]">
                — Dwayne & Britney Thompson
              </p>

            </div>

            <button className="mt-10 inline-flex items-center gap-3 rounded-xl bg-[#0F2747] px-8 py-4 font-semibold text-white transition duration-300 hover:translate-x-1 hover:bg-[#173A68]">
              Read Our Story
              <ArrowRight size={18} />
            </button>

          </div>
        </FadeIn>

      </div>
    </section>
  );
}