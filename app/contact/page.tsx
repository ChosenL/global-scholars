import type { Metadata } from "next";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ContactForm from "@/components/home/ContactForm";
import ConsultationCTA from "@/components/home/ConsultationCTA";

import { DepartmentEmails } from "@/app/_components/gsp-theme/DepartmentEmails";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Global Scholars Pathway Advisors or schedule a free online consultation.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />

      <main className="bg-white dark:bg-[#0b1323]">
        {/* HERO SECTION */}

        <section className="bg-[#071526] px-6 py-20 text-center text-white">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              Contact Us
            </p>

            <h1 className="mt-5 text-5xl font-black leading-tight md:text-7xl">
              Let&apos;s Build Your Pathway.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/75">
              Tell us where you are in your journey, what you hope to achieve,
              and where you need guidance.
            </p>
          </div>
        </section>

        {/* DEPARTMENT EMAILS */}

        <div className="bg-slate-50 px-6 py-16 dark:bg-[#0b1323]">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#B18A34] dark:text-[#E4C577]">
                Get In Touch
              </p>

              <h2 className="mt-4 text-3xl font-black text-[#0F2747] md:text-4xl dark:text-white">
                Contact the Right Team
              </h2>

              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">
                Have a question about admissions, partnerships, or student
                support? Reach out to the department best suited to assist you.
              </p>
            </div>

            <DepartmentEmails />
          </div>
        </div>

        {/* EXISTING CONTACT FORM */}

        <ContactForm />

        {/* EXISTING CONSULTATION SECTION */}

        <ConsultationCTA />
      </main>

      <Footer />
    </>
  );
}
