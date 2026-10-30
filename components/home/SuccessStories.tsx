import FadeIn from "../ui/FadeIn";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Britney Thompson",
    role: "Honors Graduate, Western Connecticut State University",
    quote:
      "My journey from UCC in Jamaica to completing my degree in the United States taught me how important proper guidance is. With research, preparation, and the right support, I was able to transfer credits, graduate with honors, and gain valuable professional experience in Human Resources.",
  },
  {
    name: "Student Testimonial",
    role: "Guided Student Experience",
    quote:
      "The support I received helped me understand the process more clearly and feel more confident about my next steps. What once felt confusing became easier to navigate with proper guidance and encouragement.",
  },
];

export default function SuccessStories() {
  return (
    <section
      id="success-stories"
      className="bg-[#F8F9FB] py-24 dark:bg-[#101c30]"
    >
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#967325] dark:text-[#E4C577]">
              Testimonials
            </p>

            <h2 className="mt-4 text-5xl font-black leading-tight text-[#0F2747] md:text-6xl dark:text-[#F1F6FC]">
              Real Stories. Real Encouragement.
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Behind every pathway is a student, a family, and a dream. These
              stories reflect why Global Scholars exists.
            </p>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {testimonials.map((item, index) => (
            <FadeIn key={item.name} delay={index * 0.08}>
              <div className="gsp-glow h-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-colors duration-300 motion-safe:hover:-translate-y-2 motion-safe:transition-transform hover:shadow-xl dark:border-slate-700 dark:bg-[#17263b] dark:hover:border-cyan-400/50">
                <div className="flex items-center gap-2 text-[#C8A24A]">
                  {[...Array(5)].map((_, starIndex) => (
                    <Star key={starIndex} size={18} fill="currentColor" />
                  ))}
                </div>

                <Quote className="mt-8 text-[#C8A24A]" size={42} />

                <p className="mt-6 text-lg leading-8 text-slate-700 dark:text-slate-200">
                  “{item.quote}”
                </p>

                <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-600">
                  <p className="text-xl font-black text-[#0F2747] dark:text-slate-100">
                    {item.name}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#967325] dark:text-[#E4C577]">
                    {item.role}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
