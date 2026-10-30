import {
  Award,
  BookOpen,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Users,
} from "lucide-react";
import FadeIn from "../ui/FadeIn";

const reasons = [
  {
    icon: GraduationCap,
    title: "We’ve Walked This Journey",
    text: "We aren’t simply consultants—we’re former international students who personally navigated admissions, transfer credits, immigration preparation, and university life in the United States.",
  },
  {
    icon: Globe2,
    title: "International Perspective",
    text: "Our journey began in Jamaica and continued in the United States. We understand the challenges, questions, and uncertainties international students face because we’ve experienced them ourselves.",
  },
  {
    icon: Award,
    title: "Proven Academic Success",
    text: "Britney successfully transferred the majority of her university credits and graduated with Honors from Western Connecticut State University while building professional experience in Human Resources.",
  },
  {
    icon: HeartHandshake,
    title: "Guidance With Integrity",
    text: "Every recommendation we give is rooted in honesty, transparency, and what’s genuinely best for each student’s future—not what’s easiest.",
  },
  {
    icon: BookOpen,
    title: "Personalized Planning",
    text: "No two students are alike. Every roadmap is tailored to your academic goals, transfer situation, financial considerations, and career aspirations.",
  },
  {
    icon: Users,
    title: "You’re Family Here",
    text: "We treat every student the same way we wished someone had guided us—with patience, encouragement, professionalism, and genuine care.",
  },
];

export default function Credibility() {
  return (
    <section className="bg-white py-24 dark:bg-[#0b1323]">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#967325] dark:text-[#E4C577]">
              Why Families Choose Us
            </p>

            <h2 className="mt-4 text-5xl font-black text-[#0F2747] dark:text-[#F1F6FC]">
              Experience You Can Trust.
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Our advice doesn’t come from theory alone. It comes from living
              the journey ourselves, overcoming the obstacles, and helping
              others avoid the same uncertainty.
            </p>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {reasons.map((item, index) => {
            const Icon = item.icon;

            return (
              <FadeIn key={item.title} delay={index * 0.08}>
                <div className="gsp-glow h-full rounded-3xl border border-slate-200 bg-[#F8F9FB] p-8 transition-colors duration-300 motion-safe:hover:-translate-y-2 motion-safe:transition-transform hover:border-[#C8A24A]/50 hover:shadow-xl dark:border-slate-700 dark:bg-[#131f32] dark:hover:border-cyan-400/50">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F2747] dark:bg-[#223b59]">
                    <Icon size={28} className="text-[#C8A24A]" />
                  </div>

                  <h3 className="mt-6 text-2xl font-bold text-[#0F2747] dark:text-slate-100">
                    {item.title}
                  </h3>

                  <p className="mt-4 leading-8 text-slate-600 dark:text-slate-300">
                    {item.text}
                  </p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
