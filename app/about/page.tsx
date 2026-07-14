import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import About from "@/components/home/About";
import ConsultationCTA from "@/components/home/ConsultationCTA";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn how Dwayne and Britney Thompson’s international education journey inspired Global Scholars Pathway Advisors.",
};

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main>
        <section className="bg-[#071526] px-6 py-20 text-center text-white">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              About Global Scholars
            </p>

            <h1 className="mt-5 text-5xl font-black leading-tight md:text-7xl">
              Experience Became Purpose.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/75">
              We understand the international education journey because we
              lived it. Today, that experience shapes how we guide students and
              families.
            </p>
          </div>
        </section>

        <About />

        <ConsultationCTA />
      </main>

      <Footer />
    </>
  );
}