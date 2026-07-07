import ContactForm from "@/components/home/ContactForm";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import FeatureCards from "@/components/home/FeatureCards";
import Credibility from "@/components/home/Credibility";
import Pathway from "@/components/home/Pathway";
import Services from "@/components/home/Services";
import About from "@/components/home/About";
import AudienceCards from "@/components/home/AudienceCards";
import SuccessStories from "@/components/home/SuccessStories";
import FAQ from "@/components/home/FAQ";
import CTA from "@/components/home/CTA";
import ConsultationCTA from "@/components/home/ConsultationCTA";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <FeatureCards />
      <Credibility />
      <Pathway />
      <Services />
      <About />
      <AudienceCards />
      <SuccessStories />
      <FAQ />
      <ConsultationCTA />
      <ContactForm />
      <Footer />
    </main>
  );
}