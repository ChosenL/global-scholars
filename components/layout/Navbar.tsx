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
  Users,
  X,
  Settings2,
} from "lucide-react";

import { useEffect, useState } from "react";

import { ThemeControls } from "@/app/_components/gsp-theme/ThemeControls";

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

const departmentEmails = [
  {
    label: "General Information",
    email: "info@globalscholarspathway.com",
  },
  {
    label: "Admissions",
    email: "admissions@globalscholarspathway.com",
  },
  {
    label: "Partnerships",
    email: "partners@globalscholarspathway.com",
  },
  {
    label: "Student Support",
    email: "support@globalscholarspathway.com",
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

  const PortalIcon = isLoaded && isSignedIn ? LayoutDashboard : LogIn;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    onScroll();

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      {/* MAIN NAVIGATION */}

      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ${
          scrolled
            ? "bg-white/95 text-[#0F2747] shadow-lg backdrop-blur-lg dark:bg-[#101c30]/95 dark:text-slate-100"
            : "bg-[#0F2747] text-white"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 xl:px-6">
          {/* LOGO */}

          <Link
            href="/"
            onClick={closeMenu}
            aria-label="Go to the homepage"
            className="shrink-0"
          >
            {/* Navy-lettered version on the white header in Light Mode. */}
            <Image
              src="/global-scholars-preferred-light-nav.webp"
              alt="Global Scholars Pathway Advisors"
              width={1784}
              height={711}
              className={`h-auto w-[190px] max-w-full object-contain xl:w-[210px] ${
                scrolled ? "block dark:hidden" : "hidden"
              }`}
            />

            {/* Preferred white-lettered version on navy headers. */}
            <Image
              src="/global-scholars-preferred-nav.webp"
              alt="Global Scholars Pathway Advisors"
              width={1779}
              height={739}
              priority
              className={`h-auto w-[190px] max-w-full object-contain xl:w-[210px] ${
                scrolled ? "hidden dark:block" : "block"
              }`}
            />
          </Link>

          {/* DESKTOP NAVIGATION */}

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-4 text-sm font-semibold xl:flex"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-md transition-colors hover:text-[#C8A24A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8A24A]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* DESKTOP ACTIONS */}

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            {/* STUDENT PORTAL */}

            <Link
              href={portalHref}
              className={`gsp-glow inline-flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
                scrolled
                  ? "border-[#0F2747]/20 hover:border-[#C8A24A] hover:text-[#C8A24A] dark:border-white/20"
                  : "border-white/30 hover:border-[#C8A24A] hover:text-[#C8A24A]"
              }`}
            >
              <PortalIcon size={18} />

              <span>{portalLabel}</span>
            </Link>

            {/* CONSULTATION BUTTON */}

            <a
              href={calendlyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="gsp-glow rounded-xl bg-[#C8A24A] px-4 py-3 text-sm font-bold text-[#0F2747] transition-transform motion-safe:hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A24A]"
            >
              Book Consultation
            </a>

            {/* THEME SETTINGS */}

            <details className="group relative">
              <summary
                aria-label="Display settings"
                title="Appearance settings"
                className={`gsp-glow flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border transition-colors [&::-webkit-details-marker]:hidden ${
                  scrolled
                    ? "border-[#0F2747]/20 hover:border-[#C8A24A] dark:border-white/20"
                    : "border-white/30 hover:border-[#C8A24A]"
                }`}
              >
                <Settings2 size={21} />

                <span className="sr-only">Appearance settings</span>
              </summary>

              <div className="gsp-theme-card absolute right-0 top-full z-[60] mt-3 w-72 p-5 shadow-2xl">
                <p className="mb-4 text-sm font-bold">Display Preferences</p>

                <ThemeControls />
              </div>
            </details>
          </div>

          {/* MOBILE MENU BUTTON */}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors xl:hidden ${
              scrolled
                ? "border-[#0F2747]/15 dark:border-white/20"
                : "border-white/20"
            }`}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            aria-controls="gsp-mobile-menu"
          >
            <Menu size={29} />
          </button>
        </div>
      </header>

      {/* MOBILE NAVIGATION */}

      {menuOpen && (
        <div id="gsp-mobile-menu" className="fixed inset-0 z-[100] xl:hidden">
          {/* OVERLAY */}

          <button
            type="button"
            onClick={closeMenu}
            className="absolute inset-0 h-full w-full bg-[#071526]/80 backdrop-blur-sm"
            aria-label="Close navigation menu"
          />

          {/* DRAWER */}

          <aside
            aria-label="Mobile navigation"
            className="absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col overflow-y-auto bg-white text-[#0F2747] shadow-2xl dark:bg-[#101c30] dark:text-slate-100"
          >
            {/* MOBILE HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <Link
                href="/"
                onClick={closeMenu}
                aria-label="Go to the homepage"
              >
                {/* Light Mode mobile drawer (white background). */}
                <Image
                  src="/global-scholars-preferred-light-nav.webp"
                  alt="Global Scholars Pathway Advisors"
                  width={1784}
                  height={711}
                  className="block h-auto w-[155px] max-w-full object-contain dark:hidden"
                />
                {/* Dark Mode mobile drawer (navy background). */}
                <Image
                  src="/global-scholars-preferred-nav.webp"
                  alt="Global Scholars Pathway Advisors"
                  width={1779}
                  height={739}
                  className="hidden h-auto w-[155px] max-w-full object-contain dark:block"
                />
              </Link>

              <button
                type="button"
                onClick={closeMenu}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8F9FB] text-[#0F2747] transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                aria-label="Close navigation menu"
              >
                <X size={26} />
              </button>
            </div>

            {/* MOBILE LINKS */}

            <div className="flex-1 px-6 py-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A24A]">
                Explore
              </p>

              <nav aria-label="Mobile links" className="mt-5 space-y-2">
                {links.map((link) => {
                  const Icon = link.icon;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className="flex items-center gap-4 rounded-2xl px-4 py-4 text-base font-bold transition-colors hover:bg-[#F8F9FB] hover:text-[#B18A34] dark:hover:bg-slate-800 dark:hover:text-[#E4C577]"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F2747] text-[#C8A24A]">
                        <Icon size={20} />
                      </span>

                      {link.label}
                    </Link>
                  );
                })}

                {/* STUDENT PORTAL */}

                <Link
                  href={portalHref}
                  onClick={closeMenu}
                  className="flex items-center gap-4 rounded-2xl bg-[#C8A24A]/15 px-4 py-4 text-base font-black transition-colors hover:bg-[#C8A24A]/25"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C8A24A] text-[#071526]">
                    <PortalIcon size={20} />
                  </span>

                  {portalLabel}
                </Link>
              </nav>

              {/* MOBILE CONSULTATION */}

              <a
                href={calendlyLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="gsp-glow mt-8 block rounded-2xl bg-[#C8A24A] px-6 py-4 text-center font-black text-[#071526] transition-transform motion-safe:hover:scale-[1.02]"
              >
                Book Free Consultation
              </a>

              {/* MOBILE THEME CONTROLS */}

              <div className="gsp-theme-card mt-7 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Settings2 size={19} className="text-[#C8A24A]" />

                  <p className="text-sm font-bold">Appearance Settings</p>
                </div>

                <ThemeControls />
              </div>

              {/* MOBILE CONTACT INFORMATION */}

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
                  {departmentEmails.map((department) => (
                    <a
                      key={department.email}
                      href={`mailto:${department.email}`}
                      className="flex items-start gap-3 transition-colors hover:text-white"
                    >
                      <Mail
                        size={18}
                        className="mt-0.5 shrink-0 text-[#C8A24A]"
                      />

                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-[#C8A24A]">
                          {department.label}
                        </span>

                        <span className="block break-all">
                          {department.email}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
