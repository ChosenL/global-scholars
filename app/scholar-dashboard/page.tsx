"use client";

import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FileCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import DocumentsCard from "./components/DocumentsCard";
import ProgressTracker from "./components/ProgressTracker";
import { useDocuments } from "./hooks/useDocuments";
import { useStudentProfile } from "./hooks/useStudentProfile";

const calendlyLink =
  "https://calendly.com/thompsondwayne0055/free-10_minute-consultation";

const messages = [
  {
    sender: "Global Scholars Advisor",
    message:
      "Your transcript has been received. We are now reviewing your transfer options.",
    time: "Today, 10:30 AM",
  },
  {
    sender: "Global Scholars",
    message:
      "Your next consultation is scheduled. Please prepare your university shortlist.",
    time: "Yesterday, 4:15 PM",
  },
];

const notifications = [
  {
    title: "Transcript received",
    description: "Your academic transcript was added to your student profile.",
    time: "Today",
    icon: FileCheck2,
  },
  {
    title: "Appointment confirmed",
    description: "Your transfer-planning consultation has been scheduled.",
    time: "Yesterday",
    icon: CalendarDays,
  },
  {
    title: "New advisor message",
    description:
      "Your advisor shared an update about your university shortlist.",
    time: "2 days ago",
    icon: MessageCircle,
  },
];

const deadlines = [
  {
    title: "Upload credential evaluation",
    date: "July 25, 2026",
    status: "Upcoming",
  },
  {
    title: "Complete university shortlist",
    date: "August 1, 2026",
    status: "Upcoming",
  },
  {
    title: "Review application documents",
    date: "August 10, 2026",
    status: "Planned",
  },
];

const activities = [
  {
    title: "Academic transcript received",
    description: "Your transcript was marked as received.",
    time: "Today at 10:30 AM",
    complete: true,
  },
  {
    title: "Transfer consultation scheduled",
    description: "A new appointment was added to your portal.",
    time: "Yesterday at 4:15 PM",
    complete: true,
  },
  {
    title: "University selection started",
    description: "Your pathway has advanced to the university-selection stage.",
    time: "July 14, 2026",
    complete: false,
  },
];

const sidebarLinks = [
  { label: "Dashboard", icon: LayoutDashboard, target: "dashboard" },
  { label: "My Progress", icon: GraduationCap, target: "progress" },
  { label: "Documents", icon: FileText, target: "documents" },
  { label: "Appointments", icon: CalendarDays, target: "appointments" },
  { label: "Messages", icon: MessageCircle, target: "messages" },
  { label: "AI Advisor", icon: Sparkles, target: "ai-advisor" },
  { label: "Profile", icon: User, target: "profile" },
] as const;

export default function ScholarDashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const { isLoaded, isSignedIn, user } = useUser();
  const {
    profile,
    progress,
    isLoading: profileLoading,
    error: profileError,
  } = useStudentProfile();
  const {
    documents,
    isLoading: documentsLoading,
    isUploading,
    deletingDocumentId,
    replacingDocumentId,
    downloadingDocumentId,
    error: documentsError,
    successMessage: documentsSuccessMessage,
    uploadDocument,
    replaceDocument,
    removeDocument,
    openDocument,
    downloadDocument,
    refreshDocuments,
    clearFeedback: clearDocumentsFeedback,
  } = useDocuments();

  const studentName =
    profile?.full_name ||
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Scholar";

  const firstName =
    profile?.full_name?.split(" ")[0] ||
    user?.firstName ||
    user?.fullName?.split(" ")[0] ||
    "Scholar";

  const progressPercent = progress?.progress_percent ?? 10;
  const currentStage = progress?.current_stage ?? "Initial Consultation";

  function openAIAdvisor() {
    const advisorButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Open Global Scholars AI Advisor"]',
    );

    advisorButton?.click();
  }

  function navigateToSection(target: string) {
    if (target === "ai-advisor") {
      openAIAdvisor();
      return;
    }

    const section = document.getElementById(target);
    if (!section) {
      return;
    }

    setActiveSection(target);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!isLoaded || (isSignedIn && profileLoading)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071526]">
        <div className="text-center text-white">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#C8A24A]" />

          <p className="mt-5 font-bold">Loading Scholar Dashboard...</p>
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071526] px-6 text-center text-white">
        <div>
          <h1 className="text-4xl font-black">Please sign in to continue.</h1>

          <Link
            href="/student-portal"
            className="mt-8 inline-block rounded-xl bg-[#C8A24A] px-7 py-4 font-black text-[#071526]"
          >
            Go to Student Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F7FA] text-[#071526]">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}

        <aside className="hidden w-72 shrink-0 flex-col bg-[#071526] px-6 py-7 text-white lg:flex">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Global Scholars Pathway Advisors"
              width={62}
              height={62}
              priority
              className="h-auto w-[62px]"
            />

            <div>
              <p className="text-sm font-black text-[#C8A24A]">
                Global Scholars
              </p>

              <p className="text-xs text-white/60">Scholar Dashboard</p>
            </div>
          </Link>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-11 w-11",
                  },
                }}
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-black">{studentName}</p>

                <p className="truncate text-xs text-white/55">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-7 space-y-2">
            {sidebarLinks.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigateToSection(item.target)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold transition ${
                    activeSection === item.target
                      ? "bg-[#C8A24A] text-[#071526]"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto">
            <div className="rounded-3xl bg-white/10 p-5">
              <p className="text-sm font-black">Need help?</p>

              <p className="mt-2 text-sm leading-6 text-white/65">
                Contact your advisor or use the Global Scholars AI Advisor.
              </p>

              <a
                href="mailto:info@globalscholarspathway.com"
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#C8A24A]"
              >
                <Mail size={16} />
                Email support
              </a>
            </div>

            <SignOutButton redirectUrl="/student-portal">
              <button
                type="button"
                className="mt-5 flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut size={20} />
                Log Out
              </button>
            </SignOutButton>
          </div>
        </aside>

        {/* Dashboard content */}

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur-lg md:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 lg:hidden"
                  aria-label="Open dashboard menu"
                >
                  <Menu size={24} />
                </button>

                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Welcome to
                  </p>

                  <h1 className="text-xl font-black text-[#071526] md:text-2xl">
                    Scholar Dashboard
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigateToSection("notifications")}
                  className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4F7FA]"
                  aria-label="Notifications"
                >
                  <Bell size={21} />

                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#C8A24A]" />
                </button>

                <div className="hidden items-center gap-3 rounded-2xl bg-[#F4F7FA] px-3 py-2 sm:flex">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "h-10 w-10",
                      },
                    }}
                  />

                  <div className="max-w-44 pr-2">
                    <p className="truncate text-sm font-black">{studentName}</p>

                    <p className="text-xs text-slate-500">Student</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 px-5 py-7 md:px-8 md:py-10">
            <div className="mx-auto max-w-7xl">
              {/* Main welcome area */}
              <section
                id="dashboard"
                className="scroll-mt-28 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#071526] via-[#0F2747] to-[#173A68] p-7 text-white shadow-xl md:p-10"
              >
                <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C8A24A]">
                      Welcome back, {firstName}
                    </p>

                    <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
                      Your pathway is moving forward.
                    </h2>

                    <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
                      Review your progress, complete your next steps, and stay
                      connected with your Global Scholars advisor.
                    </p>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                      <a
                        href={calendlyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-[#C8A24A] px-6 py-4 text-center font-black text-[#071526] transition hover:scale-[1.02]"
                      >
                        Book Appointment
                      </a>

                      <button
                        type="button"
                        onClick={openAIAdvisor}
                        className="rounded-xl border border-white/25 px-6 py-4 font-black text-white transition hover:bg-white/10"
                      >
                        Ask AI Advisor
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <p className="font-bold">Overall Progress</p>

                      <p className="text-3xl font-black text-[#C8A24A]">
                        {progressPercent}%
                      </p>
                    </div>

                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-[#C8A24A]"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <p className="mt-4 text-sm leading-6 text-white/65">
                      Your current focus is {currentStage}.
                    </p>
                  </div>
                </div>
              </section>
              {/* Overview cards */}
              <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F2747] text-[#C8A24A]">
                    <CalendarDays size={24} />
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-500">
                    Next Appointment
                  </p>

                  <h3 className="mt-2 text-xl font-black">July 22, 3:00 PM</h3>

                  <p className="mt-2 text-sm text-slate-500">
                    With a Global Scholars Advisor
                  </p>
                </article>

                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F2747] text-[#C8A24A]">
                    <FileText size={24} />
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-500">
                    Documents
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    {
                      documents.filter(
                        (document) => document.status === "approved",
                      ).length
                    }{" "}
                    Approved
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {
                      documents.filter(
                        (document) => document.status === "pending",
                      ).length
                    }{" "}
                    pending review
                  </p>
                </article>

                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F2747] text-[#C8A24A]">
                    <MessageCircle size={24} />
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-500">
                    Messages
                  </p>

                  <h3 className="mt-2 text-xl font-black">2 New Messages</h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Last update today
                  </p>
                </article>

                <article className="rounded-3xl bg-[#0F2747] p-6 text-white shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C8A24A] text-[#071526]">
                    <Bot size={24} />
                  </div>

                  <p className="mt-5 text-sm font-semibold text-white/60">
                    AI Advisor
                  </p>

                  <h3 className="mt-2 text-xl font-black">Available Now</h3>

                  <button
                    type="button"
                    onClick={openAIAdvisor}
                    className="mt-4 font-black text-[#C8A24A]"
                  >
                    Start Conversation →
                  </button>
                </article>
              </div>
              {/* Progress and appointment */}
              <div className="mt-8 grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
                <ProgressTracker
                  profile={profile}
                  progress={progress}
                  documents={documents}
                  onNavigateToDocuments={() => navigateToSection("documents")}
                />

                <div className="space-y-8">
                  <section
                    id="appointments"
                    className="scroll-mt-28 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
                          Next Appointment
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                          Transfer Planning Session
                        </h2>
                      </div>

                      <CalendarDays className="text-[#C8A24A]" size={30} />
                    </div>

                    <div className="mt-6 space-y-3 rounded-2xl bg-[#F4F7FA] p-5">
                      <p className="flex items-center gap-3 font-bold">
                        <CalendarDays size={18} />
                        July 22, 2026
                      </p>

                      <p className="flex items-center gap-3 font-bold">
                        <Clock3 size={18} />
                        3:00 PM Eastern Time
                      </p>

                      <p className="flex items-center gap-3 font-bold">
                        <User size={18} />
                        Global Scholars Advisor
                      </p>
                    </div>

                    <a
                      href={calendlyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 block w-full rounded-xl bg-[#0F2747] px-5 py-4 text-center font-black text-white transition hover:bg-[#173A68]"
                    >
                      Manage Appointment
                    </a>
                  </section>

                  <section className="rounded-[2rem] bg-[#071526] p-6 text-white shadow-xl">
                    <Sparkles className="text-[#C8A24A]" size={30} />

                    <h2 className="mt-4 text-2xl font-black">
                      Need help right now?
                    </h2>

                    <p className="mt-3 leading-7 text-white/70">
                      Ask the Global Scholars AI Advisor a general question
                      about admissions, transfers, credentials, or career
                      readiness.
                    </p>

                    <button
                      type="button"
                      onClick={openAIAdvisor}
                      className="mt-6 w-full rounded-xl bg-[#C8A24A] px-5 py-4 font-black text-[#071526]"
                    >
                      Ask AI Advisor
                    </button>
                  </section>
                </div>
              </div>
              {/* Documents and messages */}
              <div className="mt-8 space-y-8">
                <div id="documents" className="min-w-0 scroll-mt-28">
                  <DocumentsCard
                    documents={documents}
                    isLoading={documentsLoading}
                    isUploading={isUploading}
                    deletingDocumentId={deletingDocumentId}
                    replacingDocumentId={replacingDocumentId}
                    downloadingDocumentId={downloadingDocumentId}
                    error={documentsError}
                    successMessage={documentsSuccessMessage}
                    onUpload={uploadDocument}
                    onReplace={replaceDocument}
                    onOpen={openDocument}
                    onDownload={downloadDocument}
                    onRemove={removeDocument}
                    onRefresh={refreshDocuments}
                    onClearFeedback={clearDocumentsFeedback}
                  />
                </div>

                <section
                  id="messages"
                  className="min-w-0 scroll-mt-28 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8"
                >
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
                    Messages
                  </p>

                  <h2 className="mt-2 text-3xl font-black">Recent Updates</h2>

                  <div className="mt-7 space-y-4">
                    {messages.map((message) => (
                      <article
                        key={`${message.sender}-${message.time}`}
                        className="rounded-2xl border border-slate-200 p-5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-black">{message.sender}</p>

                          <p className="text-xs text-slate-400">
                            {message.time}
                          </p>
                        </div>

                        <p className="mt-3 leading-7 text-slate-600">
                          {message.message}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
              {/* Notifications and deadlines */}
              <div className="mt-8 grid gap-8 xl:grid-cols-2">
                <section
                  id="notifications"
                  className="scroll-mt-28 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
                        Notifications
                      </p>

                      <h2 className="mt-2 text-3xl font-black">
                        Recent Notifications
                      </h2>
                    </div>

                    <Bell className="text-[#C8A24A]" size={30} />
                  </div>

                  <div className="mt-7 space-y-4">
                    {notifications.map((notification) => {
                      const Icon = notification.icon;

                      return (
                        <article
                          key={notification.title}
                          className="flex gap-4 rounded-2xl bg-[#F4F7FA] p-5"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#0F2747] shadow-sm">
                            <Icon size={20} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-black">{notification.title}</p>

                              <span className="shrink-0 text-xs text-slate-400">
                                {notification.time}
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {notification.description}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section
                  id="deadlines"
                  className="scroll-mt-28 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
                        Deadlines
                      </p>

                      <h2 className="mt-2 text-3xl font-black">
                        Upcoming Deadlines
                      </h2>
                    </div>

                    <Clock3 className="text-[#C8A24A]" size={30} />
                  </div>

                  <div className="mt-7 space-y-4">
                    {deadlines.map((deadline) => (
                      <article
                        key={deadline.title}
                        className="rounded-2xl border border-slate-200 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-black">{deadline.title}</p>

                            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                              <CalendarDays size={16} />
                              {deadline.date}
                            </p>
                          </div>

                          <span className="rounded-full bg-[#C8A24A]/20 px-3 py-1 text-xs font-black text-[#8A6A1F]">
                            {deadline.status}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
              {/* Activity timeline */}
              <section
                id="activity"
                className="scroll-mt-28 mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8"
              >
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
                  Activity
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Your Activity Timeline
                </h2>

                <div className="mt-8 space-y-0">
                  {activities.map((activity, index) => (
                    <div
                      key={activity.title}
                      className="relative flex gap-5 pb-8 last:pb-0"
                    >
                      {index < activities.length - 1 && (
                        <div className="absolute left-[21px] top-11 h-[calc(100%-2rem)] w-px bg-slate-200" />
                      )}

                      <div
                        className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                          activity.complete
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-[#C8A24A]/20 text-[#8A6A1F]"
                        }`}
                      >
                        {activity.complete ? (
                          <CheckCircle2 size={21} />
                        ) : (
                          <Circle size={21} />
                        )}
                      </div>

                      <div className="pt-1">
                        <p className="font-black">{activity.title}</p>

                        <p className="mt-2 leading-6 text-slate-500">
                          {activity.description}
                        </p>

                        <p className="mt-2 text-xs font-semibold text-slate-400">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section
                id="profile"
                className="scroll-mt-28 mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8"
              >
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
                  Profile
                </p>
                <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <UserButton
                      appearance={{ elements: { avatarBox: "h-14 w-14" } }}
                    />
                    <div>
                      <h2 className="text-2xl font-black">{studentName}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {user.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </div>
                  <p className="max-w-xl text-sm leading-6 text-slate-600">
                    Use your profile avatar to manage your Clerk account.
                    Additional academic and immigration profile fields will be
                    added in the dedicated Profile module.
                  </p>
                </div>
              </section>
              {profileError ? (
                <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
                  {profileError}
                </div>
              ) : (
                <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
                  Your Clerk account, Supabase student profile, application
                  progress, and document records are connected. Appointments,
                  messages, notifications, and deadlines remain sample
                  information until their individual dashboard features are
                  connected.
                </div>
              )}{" "}
            </div>
          </div>
        </section>
      </div>

      {/* Mobile sidebar */}

      <div
        className={`fixed inset-0 z-[100] transition lg:hidden ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 bg-[#071526]/70 backdrop-blur-sm"
          aria-label="Close dashboard menu"
        />

        <aside
          className={`absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-[#071526] px-6 py-7 text-white shadow-2xl transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-3"
              onClick={() => setMenuOpen(false)}
            >
              <Image
                src="/logo.png"
                alt="Global Scholars Pathway Advisors"
                width={60}
                height={60}
                className="h-auto w-[60px]"
              />

              <div>
                <p className="text-sm font-black text-[#C8A24A]">
                  Global Scholars
                </p>

                <p className="text-xs text-white/60">Scholar Dashboard</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10"
              aria-label="Close dashboard menu"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mt-7 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-11 w-11",
                  },
                }}
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-black">{studentName}</p>

                <p className="truncate text-xs text-white/55">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-7 space-y-2">
            {sidebarLinks.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    navigateToSection(item.target);
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold ${
                    activeSection === item.target
                      ? "bg-[#C8A24A] text-[#071526]"
                      : "text-white/75"
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <SignOutButton redirectUrl="/student-portal">
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold text-white/75"
              >
                <LogOut size={20} />
                Log Out
              </button>
            </SignOutButton>
          </div>
        </aside>
      </div>
    </main>
  );
}