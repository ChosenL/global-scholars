"use client";

import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogIn,
  Mail,
  Menu,
  Phone,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const calendlyLink =
  "https://calendly.com/thompsondwayne0055/free-10_minute-consultation";

const links = [
  {
    label: "Home",
    href: "/",
    icon: Home,
  },
  {
    label: "Services",
    href: "/services",
    icon: GraduationCap,
  },
  {
    label: "Success Stories",
    href: "/success-stories",
    icon: BookOpen,
  },
  {
    label: "Resources",
    href: "/resources",
    icon: BookOpen,
  },
  {
    label: "About Us",
    href: "/about",
    icon: Users,
  },
  {
    label: "Contact",
    href: "/contact",
    icon: Mail,
  },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { isLoaded, isSignedIn } = useUser();

  const portalHref =
    isLoaded && isSignedIn ? "/scholar-dashboard" : "/student-portal";

  const portalLabel =
    isLoaded && isSignedIn ? "Scholar Dashboard" : "Student Portal";

  const PortalIcon =
    isLoaded && isSignedIn ? LayoutDashboard : LogIn;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };

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
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 shadow-lg backdrop-blur-lg"
            : "bg-[#0F2747]"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 xl:px-6">
          <Link
            href="/"
            onClick={closeMenu}
            aria-label="Go to the homepage"
          >
            <Image
              src="/logo.png"
              alt="Global Scholars Pathway Advisors"
              width={70}
              height={70}
              priority
              className="h-auto w-[70px]"
            />
          </Link>

          <nav
            className={`hidden items-center gap-5 text-sm font-semibold xl:flex ${
              scrolled ? "text-[#0F2747]" : "text-white"
            }`}
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap transition hover:text-[#C8A24A]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <Link
              href={portalHref}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                scrolled
                  ? "border-[#0F2747]/20 text-[#0F2747] hover:border-[#C8A24A] hover:text-[#C8A24A]"
                  : "border-white/30 text-white hover:border-[#C8A24A] hover:text-[#C8A24A]"
              }`}
            >
              <PortalIcon size={18} />
              {portalLabel}
            </Link>

            <a
              href={calendlyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[#C8A24A] px-5 py-3 text-sm font-bold text-[#0F2747] transition hover:scale-105"
            >
              Book Consultation
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={`flex h-12 w-12 items-center justify-center rounded-xl border transition xl:hidden ${
              scrolled
                ? "border-[#0F2747]/15 text-[#0F2747]"
                : "border-white/20 text-white"
            }`}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
          >
            <Menu size={30} />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[100] transition duration-300 xl:hidden ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          onClick={closeMenu}
          className="absolute inset-0 h-full w-full bg-[#071526]/75 backdrop-blur-sm"
          aria-label="Close navigation menu"
        />

        <aside
          className={`absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <Link
              href="/"
              onClick={closeMenu}
              aria-label="Go to the homepage"
            >
              <Image
                src="/logo.png"
                alt="Global Scholars Pathway Advisors"
                width={62}
                height={62}
                className="h-auto w-[62px]"
              />
            </Link>

            <button
              type="button"
              onClick={closeMenu}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8F9FB] text-[#0F2747] transition hover:bg-slate-200"
              aria-label="Close navigation menu"
            >
              <X size={26} />
            </button>
          </div>

          <div className="flex-1 px-6 py-7">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A24A]">
              Explore
            </p>

            <nav className="mt-5 space-y-2">
              {links.map((link) => {
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className="flex items-center gap-4 rounded-2xl px-4 py-4 text-base font-bold text-[#0F2747] transition hover:bg-[#F8F9FB] hover:text-[#C8A24A]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F2747] text-[#C8A24A]">
                      <Icon size={20} />
                    </span>

                    {link.label}
                  </Link>
                );
              })}

              <Link
                href={portalHref}
                onClick={closeMenu}
                className="flex items-center gap-4 rounded-2xl bg-[#C8A24A]/15 px-4 py-4 text-base font-black text-[#0F2747] transition hover:bg-[#C8A24A]/25"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C8A24A] text-[#071526]">
                  <PortalIcon size={20} />
                </span>

                {portalLabel}
              </Link>
            </nav>

            <a
              href={calendlyLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="mt-8 block rounded-2xl bg-[#C8A24A] px-6 py-4 text-center font-black text-[#071526] transition hover:scale-[1.02]"
            >
              Book Free Consultation
            </a>

            <div className="mt-8 rounded-3xl bg-[#071526] p-6 text-white">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
                Global Scholars
              </p>

              <p className="mt-3 text-lg font-black leading-7">
                Guiding Dreams.
                <br />
                Building Futures.
              </p>

              <div className="mt-6 space-y-4 text-sm text-white/80">
                <a
                  href="mailto:info@globalscholarspathway.com"
                  className="flex items-start gap-3 transition hover:text-white"
                >
                  <Mail
                    size={18}
                    className="mt-0.5 shrink-0 text-[#C8A24A]"
                  />

                  <span className="break-all">
                    info@globalscholarspathway.com
                  </span>
                </a>

                <a
                  href="tel:7813087146"
                  className="flex items-center gap-3 transition hover:text-white"
                >
                  <Phone
                    size={18}
                    className="shrink-0 text-[#C8A24A]"
                  />

                  <span>781-308-7146</span>
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}