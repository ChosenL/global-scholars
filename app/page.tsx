import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Pathway from "@/components/Pathway";
import Services from "@/components/Services";
import About from "@/components/About";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Pathway />
      <Services />
      <About />
    </main>
  );
}