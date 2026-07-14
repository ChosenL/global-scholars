import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SuccessStories from "@/components/home/SuccessStories";
import ConsultationCTA from "@/components/home/ConsultationCTA";

export const metadata: Metadata = {
  title: "Success Stories",
  description:
    "Read stories from students and families whose educational journeys were strengthened through guidance, planning, and support.",
};

export default function SuccessStoriesPage() {
  return (
    <>
      <Navbar />

      <main>
        <section className="bg-[#071526] px-6 py-20 text-center text-white">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              Success Stories
            </p>

            <h1 className="mt-5 text-5xl font-black leading-tight md:text-7xl">
              Every Pathway Has a Story.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/75">
              Real experiences show what becomes possible when students receive
              clarity, encouragement, and personalized support.
            </p>
          </div>
        </section>

        <SuccessStories />

        <ConsultationCTA />
      </main>

      <Footer />
    </>
  );
}