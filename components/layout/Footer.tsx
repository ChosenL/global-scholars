import Image from "next/image";
import {
  Phone,
  Mail,
  Globe,
  Clock,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#071526] text-white">
      <div className="mx-auto max-w-7xl px-6 py-20">

        <div className="grid gap-14 lg:grid-cols-4">

          {/* Brand */}

          <div>

            <Image
              src="/logo.svg"
              alt="Global Scholars"
              width={220}
              height={60}
              className="w-48"
            />

            <p className="mt-6 leading-7 text-white/70">
              Guiding students and families through every step of the
              international education journey with integrity,
              personalized guidance, and genuine care.
            </p>

            <div className="mt-8 flex gap-4">

              <a
                href="#"
                className="rounded-full bg-white/10 p-3 transition hover:bg-[#C8A24A] hover:text-[#071526]"
              >
                <Facebook size={18} />
              </a>

              <a
                href="#"
                className="rounded-full bg-white/10 p-3 transition hover:bg-[#C8A24A] hover:text-[#071526]"
              >
                <Instagram size={18} />
              </a>

              <a
                href="#"
                className="rounded-full bg-white/10 p-3 transition hover:bg-[#C8A24A] hover:text-[#071526]"
              >
                <Linkedin size={18} />
              </a>

            </div>

          </div>

          {/* Quick Links */}

          <div>

            <h3 className="text-xl font-bold text-[#C8A24A]">
              Quick Links
            </h3>

            <ul className="mt-6 space-y-4 text-white/70">

              <li><a href="#">Home</a></li>

              <li><a href="#">About</a></li>

              <li><a href="#">Services</a></li>

              <li><a href="#">Resources</a></li>

              <li><a href="#">Contact</a></li>

            </ul>

          </div>

          {/* Services */}

          <div>

            <h3 className="text-xl font-bold text-[#C8A24A]">
              Services
            </h3>

            <ul className="mt-6 space-y-4 text-white/70">

              <li>University Admissions</li>

              <li>Credential Evaluation</li>

              <li>Transfer Guidance</li>

              <li>Career Readiness</li>

              <li>Visa Preparation</li>

            </ul>

          </div>

          {/* Contact */}

          <div>

            <h3 className="text-xl font-bold text-[#C8A24A]">
              Contact Us
            </h3>

            <div className="mt-6 space-y-5">

              <div className="flex gap-3">

                <Phone className="text-[#C8A24A]" size={20} />

                <div>

                  <p>781-308-7146</p>

                  <p>781-579-9049</p>

                </div>

              </div>

              <div className="flex gap-3">

                <Mail className="text-[#C8A24A]" size={20} />

                <p>info@globalscholarspathway.com</p>

              </div>

              <div className="flex gap-3">

                <Globe className="text-[#C8A24A]" size={20} />

                <p>Virtual Consultations Worldwide</p>

              </div>

              <div className="flex gap-3">

                <Clock className="text-[#C8A24A]" size={20} />

                <p>Monday – Friday<br />9:00 AM – 5:00 PM</p>

              </div>

            </div>

          </div>

        </div>

        <div className="mt-16 border-t border-white/10 pt-8 text-center text-white/50">

          © {new Date().getFullYear()} Global Scholars Pathway Advisors.
          All Rights Reserved.

        </div>

      </div>
    </footer>
  );
}