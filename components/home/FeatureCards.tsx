import FadeIn from "../ui/FadeIn";
import {
  Users,
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
} from "lucide-react";

const features = [
  {
    title: "Personalized Guidance",
    text: "Every student. Every dream. Every pathway is uniquely designed.",
    icon: Users,
  },
  {
    title: "Integrity First",
    text: "Trusted advice that always puts students and families first.",
    icon: ShieldCheck,
  },
  {
    title: "Proven Experience",
    text: "Guidance shaped by real experience and successful outcomes.",
    icon: GraduationCap,
  },
  {
    title: "Genuine Care",
    text: "Supporting students long after they receive their acceptance.",
    icon: HeartHandshake,
  },
];

export default function FeatureCards() {
  return (
    <section className="relative z-10 -mt-8 px-6">
      <FadeIn delay={0.1}>
        <div className="mx-auto grid max-w-7xl gap-5 rounded-3xl bg-white p-6 shadow-xl md:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-2xl p-5 transition duration-300 hover:-translate-y-2 hover:bg-slate-50"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F2747]">
                  <Icon size={28} className="text-[#C8A24A]" />
                </div>

                <h3 className="text-xl font-bold text-[#0F2747]">
                  {feature.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {feature.text}
                </p>
              </div>
            );
          })}
        </div>
      </FadeIn>
    </section>
  );
}