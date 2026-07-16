"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Bot,
  CalendarCheck,
  CheckCircle2,
  FileLock2,
  GraduationCap,
} from "lucide-react";

const benefits = [
  {
    label: "Personal Scholar Dashboard",
    icon: GraduationCap,
  },
  {
    label: "Global Scholars AI Advisor",
    icon: Bot,
  },
  {
    label: "Secure Document Management",
    icon: FileLock2,
  },
  {
    label: "Appointment Tracking",
    icon: CalendarCheck,
  },
  {
    label: "Application Progress Updates",
    icon: CheckCircle2,
  },
];

export default function StudentPortalPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/scholar-dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#071526] via-[#0F2747] to-[#173A68]">
        <div className="text-center text-white">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#C8A24A]" />

          <p className="mt-4 font-bold">Loading Scholar Dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#071526] via-[#0F2747] to-[#173A68] px-4 py-8 sm:px-6 lg:py-14">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:min-h-[760px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#071526] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#C8A24A]/15 blur-3xl" />

          <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <Link href="/" aria-label="Return to Global Scholars homepage">
              <Image
                src="/logo.png"
                alt="Global Scholars Pathway Advisors"
                width={96}
                height={96}
                priority
                className="h-auto w-24"
              />
            </Link>

            <p className="mt-12 text-sm font-black uppercase tracking-[0.3em] text-[#C8A24A]">
              Global Scholars Portal
            </p>

            <h1 className="mt-5 text-5xl font-black leading-tight">
              Welcome to
              <br />
              Scholar Dashboard
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-white/75">
              Access your personalized educational workspace, monitor your
              progress, communicate with advisors, and stay informed about the
              next steps in your journey.
            </p>
          </div>

          <div className="relative rounded-[2rem] border border-white/10 bg-white/10 p-7 backdrop-blur-md">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C8A24A]">
              Inside Your Portal
            </p>

            <div className="mt-6 grid gap-3">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <div
                    key={benefit.label}
                    className="flex items-center gap-4 rounded-2xl bg-white/5 px-4 py-3"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C8A24A] text-[#071526]">
                      <Icon size={19} />
                    </span>

                    <span className="font-bold text-white/90">
                      {benefit.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#F8F9FB] px-4 py-10 sm:px-8 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:hidden">
              <Link href="/" aria-label="Return to Global Scholars homepage">
                <Image
                  src="/logo.png"
                  alt="Global Scholars Pathway Advisors"
                  width={82}
                  height={82}
                  priority
                  className="mx-auto h-auto w-[82px]"
                />
              </Link>

              <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-[#C8A24A]">
                Global Scholars Portal
              </p>

              <h1 className="mt-3 text-3xl font-black text-[#0F2747]">
                Welcome to Scholar Dashboard
              </h1>
            </div>

            <div className="mb-7 hidden text-center lg:block">
              <p className="text-sm font-black uppercase tracking-[0.3em] text-[#C8A24A]">
                Secure Student Access
              </p>

              <h2 className="mt-3 text-4xl font-black text-[#0F2747]">
                Sign in to continue
              </h2>

              <p className="mt-3 text-slate-500">
                Access your personalized Scholar Dashboard.
              </p>
            </div>

            <div className="flex justify-center">
              <SignIn
                routing="hash"
                withSignUp
                fallbackRedirectUrl="/scholar-dashboard"
                signUpFallbackRedirectUrl="/scholar-dashboard"
                appearance={{
                  variables: {
                    colorPrimary: "#0F2747",
                    colorText: "#071526",
                    colorTextSecondary: "#64748B",
                    colorBackground: "#FFFFFF",
                    colorInputBackground: "#FFFFFF",
                    colorInputText: "#071526",
                    borderRadius: "0.9rem",
                  },
                  elements: {
                    rootBox: "w-full",
                    cardBox: "w-full shadow-none",
                    card:
                      "w-full rounded-[1.75rem] border border-slate-200 bg-white shadow-xl",
                    headerTitle: "text-[#0F2747] font-black",
                    headerSubtitle: "text-slate-500",
                    socialButtonsBlockButton:
                      "rounded-xl border-slate-200 font-bold transition hover:bg-slate-50",
                    formFieldLabel: "font-bold text-[#0F2747]",
                    formFieldInput:
                      "rounded-xl border-slate-300 focus:border-[#C8A24A] focus:ring-[#C8A24A]",
                    formButtonPrimary:
                      "rounded-xl bg-[#C8A24A] py-3 font-black text-[#071526] shadow-none hover:bg-[#D5B35D]",
                    footerActionLink:
                      "font-black text-[#0F2747] hover:text-[#C8A24A]",
                    identityPreviewEditButton:
                      "text-[#0F2747] hover:text-[#C8A24A]",
                    formResendCodeLink:
                      "font-bold text-[#0F2747] hover:text-[#C8A24A]",
                  },
                }}
              />
            </div>

            <p className="mx-auto mt-6 max-w-sm text-center text-xs leading-5 text-slate-400">
              By signing in, you are accessing a secure Global Scholars Pathway
              Advisors student workspace.
            </p>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm font-bold text-[#0F2747] transition hover:text-[#C8A24A]"
              >
                ← Return to the main website
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}