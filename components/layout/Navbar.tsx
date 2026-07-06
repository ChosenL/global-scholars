"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "Success Stories", href: "#success-stories" },
  { label: "About", href: "#about" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 shadow-lg backdrop-blur-lg" : "bg-[#0F2747]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#home">
          <Image
            src="/logo.png"
            alt="Global Scholars Pathway Advisors"
            width={70}
            height={70}
            priority
            className="h-auto w-[70px]"
          />
        </a>

        <nav
          className={`hidden items-center gap-8 text-sm font-semibold lg:flex ${
            scrolled ? "text-[#0F2747]" : "text-white"
          }`}
        >
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-[#C8A24A]">
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#contact"
          className="hidden rounded-xl bg-[#C8A24A] px-6 py-3 font-bold text-[#0F2747] transition hover:scale-105 lg:inline-block"
        >
          Book Consultation
        </a>

        <button className={`lg:hidden ${scrolled ? "text-[#0F2747]" : "text-white"}`}>
          <Menu size={30} />
        </button>
      </div>
    </header>
  );
}