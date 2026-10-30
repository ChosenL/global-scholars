"use client";

import { useState } from "react";

const calendlyLink =
  "https://calendly.com/thompsondwayne0055/free-10_minute-consultation";

const inputStyle =
  "w-full rounded-xl border border-slate-300 bg-white p-4 text-[#0F2747] " +
  "placeholder:text-slate-500 outline-none transition " +
  "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 " +
  "dark:border-slate-600 dark:bg-[#16243a] dark:text-white " +
  "dark:placeholder:text-slate-400 " +
  "dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20";

export default function ContactForm() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (status === "loading") return;

    const form = e.currentTarget;
    const data = new FormData(form);

    setStatus("loading");

    try {
      const response = await fetch("https://formspree.io/f/xojobpqv", {
        method: "POST",
        body: data,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        setStatus("error");
        return;
      }

      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      id="contact-form"
      className="bg-[#F8F9FB] px-4 py-24 transition-colors duration-300 dark:bg-[#0b1323] sm:px-6"
    >
      <div className="mx-auto max-w-5xl">
        {/* SECTION HEADING */}

        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#9A7425] sm:tracking-[0.35em] dark:text-[#E4C577]">
            Free Consultation
          </p>

          <h2 className="mt-4 text-4xl font-black text-[#0F2747] sm:text-5xl dark:text-white">
            Start Your Journey
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Tell us about your educational goals and we&apos;ll help you
            determine the next best step.
          </p>
        </div>

        {/* CONTACT FORM */}

        <form
          onSubmit={handleSubmit}
          aria-busy={status === "loading"}
          className="mt-16 grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl transition-colors duration-300 sm:p-10 md:grid-cols-2 dark:border-slate-700 dark:bg-[#101c30] dark:shadow-black/30"
        >
          {/* FIRST NAME */}

          <div>
            <label
              htmlFor="contact-first-name"
              className="mb-2 block text-sm font-semibold text-[#0F2747] dark:text-slate-200"
            >
              First Name *
            </label>

            <input
              id="contact-first-name"
              name="firstName"
              placeholder="First Name"
              autoComplete="given-name"
              required
              className={inputStyle}
            />
          </div>

          {/* LAST NAME */}

          <div>
            <label
              htmlFor="contact-last-name"
              className="mb-2 block text-sm font-semibold text-[#0F2747] dark:text-slate-200"
            >
              Last Name *
            </label>

            <input
              id="contact-last-name"
              name="lastName"
              placeholder="Last Name"
              autoComplete="family-name"
              required
              className={inputStyle}
            />
          </div>

          {/* EMAIL ADDRESS */}

          <div>
            <label
              htmlFor="contact-email"
              className="mb-2 block text-sm font-semibold text-[#0F2747] dark:text-slate-200"
            >
              Email Address *
            </label>

            <input
              id="contact-email"
              type="email"
              name="email"
              placeholder="Email Address"
              autoComplete="email"
              required
              className={inputStyle}
            />
          </div>

          {/* PHONE NUMBER - OPTIONAL */}

          <div>
            <label
              htmlFor="contact-phone"
              className="mb-2 block text-sm font-semibold text-[#0F2747] dark:text-slate-200"
            >
              Phone Number (Optional)
            </label>

            <input
              id="contact-phone"
              type="tel"
              name="phone"
              placeholder="Phone Number"
              autoComplete="tel"
              className={inputStyle}
            />
          </div>

          {/* COUNTRY */}

          <div>
            <label
              htmlFor="contact-country"
              className="mb-2 block text-sm font-semibold text-[#0F2747] dark:text-slate-200"
            >
              Country *
            </label>

            <input
              id="contact-country"
              name="country"
              placeholder="Country"
              autoComplete="country-name"
              required
              className={inputStyle}
            />
          </div>

          {/* CURRENT SCHOOL */}

          <div>
            <label
              htmlFor="contact-school"
              className="mb-2 block text-sm font-semibold text-[#0F2747] dark:text-slate-200"
            >
              Current School / University
            </label>

            <input
              id="contact-school"
              name="school"
              placeholder="Current School / University"
              className={inputStyle}
            />
          </div>

          {/* INTENDED MAJOR */}

          <div className="md:col-span-2">
            <label
              htmlFor="contact-major"
              className="mb-2 block text-sm font-semibold text-[#0F2747] dark:text-slate-200"
            >
              Intended Major
            </label>

            <input
              id="contact-major"
              name="major"
              placeholder="Intended Major"
              className={inputStyle}
            />
          </div>

          {/* SERVICE SELECTOR */}

          <div className="md:col-span-2">
            <label
              htmlFor="contact-service"
              className="mb-2 block text-sm font-semibold text-[#0F2747] dark:text-slate-200"
            >
              Service Required *
            </label>

            <select
              id="contact-service"
              name="service"
              required
              defaultValue=""
              className={inputStyle}
            >
              <option value="">Select a Service</option>

              <option>University Admissions Guidance</option>

              <option>College Transfer Guidance</option>

              <option>Credential Evaluation Guidance</option>

              <option>Resume Development</option>

              <option>Career Readiness</option>

              <option>Visa Preparation Guidance</option>

              <option>CPT Educational Guidance</option>

              <option>OPT Educational Guidance</option>

              <option>Other</option>
            </select>
          </div>

          {/* MESSAGE */}

          <div className="md:col-span-2">
            <label
              htmlFor="contact-message"
              className="mb-2 block text-sm font-semibold text-[#0F2747] dark:text-slate-200"
            >
              Tell Us About Your Goals *
            </label>

            <textarea
              id="contact-message"
              name="message"
              rows={6}
              placeholder="Tell us about your educational goals..."
              required
              className={inputStyle}
            />
          </div>

          {/* SUBMIT BUTTON */}

          <button
            type="submit"
            disabled={status === "loading"}
            className="gsp-glow rounded-xl bg-[#0F2747] px-8 py-5 font-bold text-white transition-all duration-300 hover:bg-[#173A68] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2 dark:bg-[#17659A] dark:hover:bg-[#207BB6]"
          >
            {status === "loading"
              ? "Submitting..."
              : "Request My Free Consultation"}
          </button>

          {/* SUCCESS MESSAGE */}

          {status === "success" && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-2xl border border-green-200 bg-green-50 p-6 text-green-900 md:col-span-2 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
            >
              <p className="font-bold">Thank you! Your request was received.</p>

              <p className="mt-2">
                We&apos;ll contact you soon. You can also book your free
                consultation now.
              </p>

              <a
                href={calendlyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="gsp-glow mt-5 inline-block rounded-xl bg-[#0F2747] px-6 py-3 font-bold text-white transition-colors hover:bg-[#173A68] dark:bg-[#17659A] dark:hover:bg-[#207BB6]"
              >
                Book Now
              </a>
            </div>
          )}

          {/* ERROR MESSAGE */}

          {status === "error" && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 md:col-span-2 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
            >
              <p className="font-semibold">
                Something went wrong. Please try again.
              </p>

              <p className="mt-2 text-sm">
                If the problem continues, email us at{" "}
                <a
                  href="mailto:info@globalscholarspathway.com"
                  className="font-bold underline"
                >
                  info@globalscholarspathway.com
                </a>
                .
              </p>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
