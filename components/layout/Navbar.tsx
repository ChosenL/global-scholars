"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-lg shadow-lg"
          : "bg-[#0F2747]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Logo */}

       <Image
  src="/logo.png"
  alt="Global Scholars Pathway Advisors"
  width={56}
  height={56}
  priority
/>

        {/* Desktop Navigation */}

        <nav
          className={`hidden items-center gap-8 text-sm font-semibold lg:flex ${
            scrolled ? "text-[#0F2747]" : "text-white"
          }`}
        >
          <a href="#">Home</a>
          <a href="#">Journey</a>
          <a href="#">Services</a>
          <a href="#">Resources</a>
          <a href="#">About</a>
          <a href="#">Contact</a>
        </nav>

        {/* CTA */}

        <div className="hidden lg:block">
          <button className="rounded-xl bg-[#C8A24A] px-6 py-3 font-bold text-[#0F2747] transition hover:scale-105">
            Book Consultation
          </button>
        </div>

        {/* Mobile */}

        <button
          className={`lg:hidden ${
            scrolled ? "text-[#0F2747]" : "text-white"
          }`}
        >
          <Menu size={30} />
        </button>

      </div>
    </header>
  );
}