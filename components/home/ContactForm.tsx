"use client";

import { useState } from "react";

const calendlyLink =
  "https://calendly.com/thompsondwayne0055/free-10_minute-consultation";

export default function ContactForm() {
  const [status, setStatus] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const form = e.currentTarget;
    const data = new FormData(form);

    const response = await fetch("https://formspree.io/f/xojobpqv", {
      method: "POST",
      body: data,
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      setStatus("success");
      form.reset();
    } else {
      setStatus("error");
    }
  }

  return (
    <section id="contact-form" className="bg-[#F8F9FB] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
            Free Consultation
          </p>

          <h2 className="mt-4 text-5xl font-black text-[#0F2747]">
            Start Your Journey
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Tell us about your educational goals and we&apos;ll help you
            determine the next best step.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-16 grid gap-6 rounded-3xl bg-white p-10 shadow-xl md:grid-cols-2"
        >
          <input name="firstName" placeholder="First Name" required className="rounded-xl border p-4" />
          <input name="lastName" placeholder="Last Name" required className="rounded-xl border p-4" />
          <input type="email" name="email" placeholder="Email Address" required className="rounded-xl border p-4" />
          <input name="phone" placeholder="Phone Number" className="rounded-xl border p-4" />
          <input name="country" placeholder="Country" required className="rounded-xl border p-4" />
          <input name="school" placeholder="Current School / University" className="rounded-xl border p-4" />
          <input name="major" placeholder="Intended Major" className="rounded-xl border p-4 md:col-span-2" />

          <select name="service" required className="rounded-xl border p-4 md:col-span-2">
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

          <textarea
            name="message"
            rows={6}
            placeholder="Tell us about your educational goals..."
            required
            className="rounded-xl border p-4 md:col-span-2"
          />

          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-xl bg-[#0F2747] px-8 py-5 font-bold text-white transition hover:bg-[#173A68] disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
          >
            {status === "loading"
              ? "Submitting..."
              : "Request My Free Consultation"}
          </button>

          {status === "success" && (
            <div className="rounded-2xl bg-green-50 p-6 text-green-800 md:col-span-2">
              <p className="font-bold">✅ Thank you! Your request was received.</p>
              <p className="mt-2">
                We&apos;ll contact you soon. You can also book your free
                consultation now.
              </p>

              <a
                href={calendlyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block rounded-xl bg-[#0F2747] px-6 py-3 font-bold text-white transition hover:bg-[#173A68]"
              >
                Book Now
              </a>
            </div>
          )}

          {status === "error" && (
            <p className="font-semibold text-red-600 md:col-span-2">
              Something went wrong. Please try again.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}