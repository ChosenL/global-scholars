"use client";

import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const calendlyLink =
  "https://calendly.com/thompsondwayne0055/free-10_minute-consultation";

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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);

    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? "bg-white/95 text-[#0F2747] shadow-lg backdrop-blur-lg"
          : "bg-[#0F2747] text-white"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#home" onClick={closeMenu} aria-label="Go to homepage">
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
            <a
              key={link.href}
              href={link.href}
              className="transition hover:text-[#C8A24A]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href={calendlyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden rounded-xl bg-[#C8A24A] px-6 py-3 font-bold text-[#0F2747] transition hover:scale-105 lg:inline-block"
        >
          Book Consultation
        </a>

        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="relative z-[60] flex h-12 w-12 items-center justify-center rounded-xl border border-current/15 lg:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={30} /> : <Menu size={30} />}
        </button>
      </div>

      <div
        className={`fixed inset-0 top-[102px] z-50 bg-[#071526]/60 backdrop-blur-sm transition duration-300 lg:hidden ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeMenu}
      >
        <div
          className={`ml-auto h-full w-[88%] max-w-sm bg-white px-6 py-8 text-[#0F2747] shadow-2xl transition duration-300 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#C8A24A]">
            Explore
          </p>

          <nav className="mt-6 flex flex-col">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="border-b border-slate-200 py-5 text-lg font-bold transition hover:pl-2 hover:text-[#C8A24A]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <a
            href={calendlyLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMenu}
            className="mt-8 block rounded-xl bg-[#C8A24A] px-6 py-4 text-center font-bold text-[#071526] transition hover:scale-[1.02]"
          >
            Book Free Consultation
          </a>

          <div className="mt-8 rounded-2xl bg-[#F8F9FB] p-5">
            <p className="text-sm font-bold text-[#0F2747]">
              Global Scholars Pathway Advisors
            </p>

            <a
              href="mailto:info@globalscholarspathway.com"
              className="mt-2 block break-all text-sm text-slate-600"
            >
              info@globalscholarspathway.com
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}