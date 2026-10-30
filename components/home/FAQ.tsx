"use client";

import { useState } from "react";
import FadeIn from "../ui/FadeIn";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Is the first consultation free?",
    answer:
      "Yes. We currently offer a free 10-minute consultation to understand your goals, explain the process, and recommend the best next step.",
  },
  {
    question: "Do you work with students outside Jamaica?",
    answer:
      "Yes. We are based online and can support students and families from Jamaica, the Caribbean, and other regions who are exploring education opportunities in the United States.",
  },
  {
    question: "Do you guarantee admission or scholarships?",
    answer:
      "No. Admissions and scholarships are decided by universities and scholarship organizations. Our role is to help students prepare stronger applications and make informed decisions.",
  },
  {
    question: "Are consultations online or in person?",
    answer:
      "For now, consultations are offered online. You can request a consultation at any time, and we will follow up to confirm availability.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-24 dark:bg-[#0b1323]">
      <div className="mx-auto max-w-4xl px-6">
        <FadeIn>
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#967325] dark:text-[#E4C577]">
              Questions
            </p>

            <h2 className="mt-4 text-4xl font-black text-[#0F2747] md:text-5xl dark:text-[#F1F6FC]">
              What Families Ask First
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Clear answers before you take the next step.
            </p>
          </div>
        </FadeIn>

        <div className="mt-14 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <FadeIn key={faq.question} delay={index * 0.06}>
                <div className="rounded-2xl border border-slate-200 bg-[#F8F9FB] transition-colors dark:border-slate-700 dark:bg-[#131f32]">
                  <button
                    type="button"
                    id={`faq-question-${index}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-6 rounded-2xl px-6 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A24A]"
                  >
                    <span className="text-lg font-bold text-[#0F2747] dark:text-slate-100">
                      {faq.question}
                    </span>

                    <ChevronDown
                      className={`shrink-0 text-[#C8A24A] motion-safe:transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    id={`faq-answer-${index}`}
                    role="region"
                    hidden={!isOpen}
                    aria-labelledby={`faq-question-${index}`}
                    className="px-6 pb-6 leading-7 text-slate-600 dark:text-slate-300"
                  >
                    {faq.answer}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
