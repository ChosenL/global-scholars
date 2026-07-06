import FadeIn from "../ui/FadeIn";
import {
  Building2,
  ArrowRightLeft,
  FileCheck2,
  ScrollText,
  BriefcaseBusiness,
  Landmark,
  GraduationCap,
  PlaneTakeoff,
} from "lucide-react";

const services = [
  {
    title: "University Admissions Guidance",
    description:
      "We help students identify best-fit U.S. colleges, understand requirements, and prepare strong applications.",
    icon: Building2,
  },
  {
    title: "College Transfer Guidance",
    description:
      "Support for students transferring between institutions with clarity around credits, timelines, and next steps.",
    icon: ArrowRightLeft,
  },
  {
    title: "Credential Evaluation Guidance",
    description:
      "Guidance through ECE, WES, and similar evaluation processes so families understand what is required.",
    icon: FileCheck2,
  },
  {
    title: "Resume Development",
    description:
      "We help students create U.S.-style resumes that communicate their strengths, experience, and potential.",
    icon: ScrollText,
  },
  {
    title: "Career Readiness",
    description:
      "Practical support for interviews, professional communication, LinkedIn, networking, and workplace preparation.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Visa Preparation Guidance",
    description:
      "Educational guidance to help students understand visa preparation expectations and organize documents.",
    icon: PlaneTakeoff,
  },
  {
    title: "CPT Educational Guidance",
    description:
      "Helping students understand Curricular Practical Training concepts and how to discuss options with their school.",
    icon: Landmark,
  },
  {
    title: "OPT Educational Guidance",
    description:
      "Guidance around Optional Practical Training timelines, career planning, and post-graduation readiness.",
    icon: GraduationCap,
  },
];

export default function Services() {
  return (
    <section className="relative overflow-hidden bg-[#F8F9FB] py-24">
      <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-[#C8A24A]/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#0F2747]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              Our Services
            </p>

            <h2 className="mt-4 text-4xl font-black text-[#0F2747] md:text-5xl">
              Comprehensive Support. Lasting Impact.
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              From admissions and credential evaluations to career readiness and
              OPT/CPT education, Global Scholars supports students through every
              major step of the journey.
            </p>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => {
            const Icon = service.icon;

            return (
              <FadeIn key={service.title} delay={index * 0.06}>
                <div className="group h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-2 hover:border-[#C8A24A]/60 hover:shadow-xl">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F2747] transition group-hover:bg-[#C8A24A]">
                    <Icon
                      size={28}
                      className="text-[#C8A24A] transition group-hover:text-[#0F2747]"
                    />
                  </div>

                  <h3 className="text-xl font-bold text-[#0F2747]">
                    {service.title}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {service.description}
                  </p>

                  <a
                    href="#"
                    className="mt-6 inline-block text-sm font-bold text-[#0F2747]"
                  >
                    Learn More →
                  </a>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}