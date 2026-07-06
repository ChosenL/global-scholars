import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import FeatureCards from "@/components/home/FeatureCards";
import Pathway from "@/components/home/Pathway";
import Services from "@/components/home/Services";
import About from "@/components/home/About";
import AudienceCards from "@/components/home/AudienceCards";
import SuccessStories from "@/components/home/SuccessStories";
import CTA from "@/components/home/CTA";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <FeatureCards />
      <Pathway />
      <Services />
      <About />
      <AudienceCards />
      <SuccessStories />
      <CTA />
      <Footer />
    </main>
  );
}