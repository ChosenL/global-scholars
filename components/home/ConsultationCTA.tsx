import FadeIn from "../ui/FadeIn";
import { Calendar, Phone, ArrowRight } from "lucide-react";
import Button from "../ui/Button";

export default function ConsultationCTA() {
  return (
    <section className="relative overflow-hidden py-28">
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F2747] via-[#173A68] to-[#0F2747]" />

      <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#C8A24A]/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">

        <FadeIn>

          <div className="mx-auto max-w-4xl text-center text-white">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2">

              <Calendar size={18} />

              <span className="font-semibold">
                FREE 10-Minute Consultation
              </span>

            </div>

            <h2 className="text-5xl font-black md:text-6xl">
              Your Future Starts Today.
            </h2>

            <p className="mx-auto mt-8 max-w-3xl text-xl leading-9 text-white/80">
              Whether you're exploring universities, scholarships,
              credential evaluations, transfers, or career opportunities,
              we're here to guide you every step of the way.
            </p>

            <div className="mt-12 flex flex-col justify-center gap-5 sm:flex-row">

              <Button>
                Book Free Consultation
              </Button>

              <a
                href="tel:7813087146"
                className="inline-flex items-center justify-center gap-3 rounded-xl border border-white px-8 py-4 font-semibold text-white transition hover:bg-white hover:text-[#0F2747]"
              >
                <Phone size={18} />
                Call Us
              </a>

            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm font-semibold text-white/75">

              <span>✓ Online Consultations</span>

              <span>✓ Personalized Guidance</span>

              <span>✓ Flexible Scheduling</span>

            </div>

          </div>

        </FadeIn>

      </div>
    </section>
  );
}