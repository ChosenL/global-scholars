import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ContactForm from "@/components/home/ContactForm";
import ConsultationCTA from "@/components/home/ConsultationCTA";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Global Scholars Pathway Advisors or schedule a free online consultation.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />

      <main>
        <section className="bg-[#071526] px-6 py-20 text-center text-white">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              Contact Us
            </p>

            <h1 className="mt-5 text-5xl font-black leading-tight md:text-7xl">
              Let’s Build Your Pathway.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/75">
              Tell us where you are in your journey, what you hope to achieve,
              and where you need guidance.
            </p>
          </div>
        </section>

        <ContactForm />

        <ConsultationCTA />
      </main>

      <Footer />
    </>
  );
}