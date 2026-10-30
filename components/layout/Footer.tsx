import Image from "next/image";
import Link from "next/link";

import { Mail, Globe, Clock } from "lucide-react";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Resources", href: "/resources" },
  { label: "Contact", href: "/contact" },
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

export default function Footer() {
  return (
    <footer className="bg-[#071526] text-white">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-14 lg:grid-cols-4">
          {/* COMPANY INFORMATION */}

          <div>
            <Image
              src="/global-scholars-logo-dark-nav.webp"
              alt="Global Scholars"
              width={220}
              height={60}
              className="h-auto w-48"
            />

            <p className="mt-6 leading-7 text-white/70">
              Guiding students and families through every step of the
              international education journey with integrity, personalized
              guidance, and genuine care.
            </p>
          </div>

          {/* QUICK LINKS */}

          <div>
            <h3 className="text-xl font-bold text-[#C8A24A]">Quick Links</h3>

            <ul className="mt-6 space-y-4 text-white/70">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-[#C8A24A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* SERVICES */}

          <div>
            <h3 className="text-xl font-bold text-[#C8A24A]">Services</h3>

            <ul className="mt-6 space-y-4 text-white/70">
              <li>University Admissions</li>
              <li>Credential Evaluation</li>
              <li>Transfer Guidance</li>
              <li>Career Readiness</li>
              <li>Visa Preparation</li>
            </ul>
          </div>

          {/* CONTACT INFORMATION */}

          <div>
            <h3 className="text-xl font-bold text-[#C8A24A]">Contact Us</h3>

            <div className="mt-6 space-y-5">
              {/* DEPARTMENT EMAILS */}

              {departmentEmails.map((department) => (
                <div key={department.email} className="flex items-start gap-3">
                  <Mail className="mt-1 shrink-0 text-[#C8A24A]" size={20} />

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#C8A24A]">
                      {department.label}
                    </p>

                    <a
                      href={`mailto:${department.email}`}
                      className="mt-1 block break-all text-sm text-white/75 transition-colors hover:text-white hover:underline"
                    >
                      {department.email}
                    </a>
                  </div>
                </div>
              ))}

              {/* CONSULTATIONS */}

              <div className="flex items-start gap-3 pt-2">
                <Globe className="mt-1 shrink-0 text-[#C8A24A]" size={20} />

                <p className="text-white/75">Virtual Consultations Worldwide</p>
              </div>

              {/* BUSINESS HOURS */}

              <div className="flex items-start gap-3">
                <Clock className="mt-1 shrink-0 text-[#C8A24A]" size={20} />

                <p className="text-white/75">
                  Monday – Friday
                  <br />
                  9:00 AM – 5:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* COPYRIGHT */}

        <div className="mt-16 border-t border-white/10 pt-8 text-center text-white/50">
          © {new Date().getFullYear()} Global Scholars Pathway Advisors. All
          Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
