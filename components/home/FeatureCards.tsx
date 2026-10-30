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
    <section
      aria-label="Why choose Global Scholars"
      className="relative z-10 -mt-8 bg-transparent px-6"
    >
      <FadeIn delay={0.1}>
        {/* MAIN FEATURE CONTAINER */}

        <div
          className="
            mx-auto grid max-w-7xl gap-5
            rounded-3xl border border-slate-100
            bg-white p-6 shadow-xl
            transition-colors duration-300
            md:grid-cols-4

            dark:border-slate-700
            dark:bg-[#131f32]
            dark:shadow-black/30
          "
        >
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="
                  gsp-glow group
                  rounded-2xl border border-transparent
                  p-5
                  transition-colors duration-300

                  hover:border-[#C8A24A]/30
                  hover:bg-slate-50

                  motion-safe:transition-transform
                  motion-safe:hover:-translate-y-2

                  dark:hover:border-cyan-500/30
                  dark:hover:bg-[#1a2c45]
                "
              >
                {/* FEATURE ICON */}

                <div
                  className="
                    mb-5 flex h-14 w-14
                    items-center justify-center
                    rounded-2xl
                    bg-[#0F2747]
                    transition-colors duration-300

                    group-hover:bg-[#173A68]

                    dark:bg-[#223b59]
                    dark:group-hover:bg-[#2a4d70]
                  "
                >
                  <Icon
                    size={28}
                    className="
                      text-[#C8A24A]
                      dark:text-[#E4C577]
                    "
                    aria-hidden="true"
                  />
                </div>

                {/* FEATURE TITLE */}

                <h3
                  className="
                    text-xl font-bold
                    text-[#0F2747]
                    transition-colors

                    dark:text-[#F1F6FC]
                  "
                >
                  {feature.title}
                </h3>

                {/* FEATURE DESCRIPTION */}

                <p
                  className="
                    mt-3 leading-7
                    text-slate-600
                    transition-colors

                    dark:text-slate-300
                  "
                >
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
