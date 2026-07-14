import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Download,
  GraduationCap,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Educational resources for students, families, university partners, and employers.",
};

const resources = [
  {
    title: "For Students",
    description:
      "Application preparation, transfer planning, credential evaluations, career readiness, and international student guidance.",
    icon: GraduationCap,
  },
  {
    title: "For Families",
    description:
      "Clear information to help families understand costs, timelines, requirements, and important educational decisions.",
    icon: Users,
  },
  {
    title: "For University Partners",
    description:
      "Opportunities to connect with prepared students and strengthen international education pathways.",
    icon: Building2,
  },
  {
    title: "For Employers",
    description:
      "Resources supporting student career readiness, professional development, internships, and workplace preparation.",
    icon: BriefcaseBusiness,
  },
];

export default function ResourcesPage() {
  return (
    <>
      <Navbar />

      <main>
        <section className="bg-[#071526] px-6 py-20 text-center text-white">
          <div className="mx-auto max-w-4xl">
            <BookOpen className="mx-auto text-[#C8A24A]" size={46} />

            <p className="mt-6 text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              Resource Center
            </p>

            <h1 className="mt-5 text-5xl font-black leading-tight md:text-7xl">
              Knowledge Creates Confidence.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/75">
              Explore useful information designed to help students, families,
              universities, and employers make informed decisions.
            </p>
          </div>
        </section>

        <section className="bg-[#F8F9FB] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-7 md:grid-cols-2">
              {resources.map((resource) => {
                const Icon = resource.icon;

                return (
                  <article
                    key={resource.title}
                    className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F2747] text-[#C8A24A]">
                      <Icon size={28} />
                    </div>

                    <h2 className="mt-6 text-3xl font-black text-[#0F2747]">
                      {resource.title}
                    </h2>

                    <p className="mt-4 text-lg leading-8 text-slate-600">
                      {resource.description}
                    </p>

                    <div className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#C8A24A]">
                      <Download size={18} />
                      Guides Coming Soon
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-16 rounded-[2rem] bg-[#0F2747] px-8 py-14 text-center text-white">
              <h2 className="text-4xl font-black">
                Need Guidance Beyond These Resources?
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/75">
                A consultation allows us to understand your individual goals
                and recommend your next best step.
              </p>

              <Link
                href="/contact"
                className="mt-8 inline-block rounded-xl bg-[#C8A24A] px-8 py-4 font-bold text-[#071526] transition hover:scale-105"
              >
                Contact an Advisor
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}