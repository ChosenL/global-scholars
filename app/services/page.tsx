import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Services from "@/components/home/Services";
import ConsultationCTA from "@/components/home/ConsultationCTA";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore university admissions, college transfer, credential evaluation, career readiness, resume, CPT, OPT, and visa preparation guidance.",
};

export default function ServicesPage() {
  return (
    <>
      <Navbar />

      <main>
        <section className="bg-[#071526] px-6 py-20 text-center text-white">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              Our Services
            </p>

            <h1 className="mt-5 text-5xl font-black leading-tight md:text-7xl">
              Guidance for Every Major Step.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/75">
              Receive personalized support designed to help you make informed
              decisions throughout your educational and professional journey.
            </p>
          </div>
        </section>

        <Services />

        <ConsultationCTA />
      </main>

      <Footer />
    </>
  );
}