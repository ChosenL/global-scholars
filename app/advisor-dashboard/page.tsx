"use client";

import {
  SignOutButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import {
  AlertCircle,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useCrmProfile } from "@/app/hooks/useCrmProfile";
import { usePlatformRole } from "@/app/hooks/usePlatformRole";
import StudentWorkspace from "./components/StudentWorkspace";
import {
  type AdvisorStudent,
  useAdvisorStudents,
} from "./hooks/useAdvisorStudents";

type AdvisorSection = "overview" | "students" | "messages";

const navigationItems: Array<{
  id: AdvisorSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "students",
    label: "Assigned Students",
    icon: Users,
  },
  {
    id: "messages",
    label: "Student Workspace",
    icon: MessageCircle,
  },
];

function formatAssignedDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Assignment date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "ST";
}

export default function AdvisorDashboardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  useCrmProfile();

  const {
    role,
    isLoading: isLoadingRole,
    error: roleError,
    isAdvisor,
  } = usePlatformRole();

  const {
    students,
    isLoading: isLoadingStudents,
    error: studentsError,
    refreshStudents,
  } = useAdvisorStudents();

  const [activeSection, setActiveSection] =
    useState<AdvisorSection>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] =
    useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || isLoadingRole) {
      return;
    }

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    if (role === "student") {
      router.replace("/scholar-dashboard");
    }
  }, [
    isLoaded,
    isLoadingRole,
    isSignedIn,
    role,
    router,
  ]);

  useEffect(() => {
    if (
      selectedStudentId &&
      students.some(
        (student) => student.userId === selectedStudentId,
      )
    ) {
      return;
    }

    // Keep the selected student valid when assignments change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedStudentId(students[0]?.userId ?? null);
  }, [selectedStudentId, students]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return students;
    }

    return students.filter((student) => {
      const searchableValue = [
        student.displayName,
        student.email ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableValue.includes(normalizedQuery);
    });
  }, [searchQuery, students]);

  const selectedStudent = useMemo(
    () =>
      students.find(
        (student) => student.userId === selectedStudentId,
      ) ?? null,
    [selectedStudentId, students],
  );

  const advisorName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Advisor";

  const advisorEmail =
    user?.primaryEmailAddress?.emailAddress ?? "";

  function navigateTo(section: AdvisorSection): void {
    setActiveSection(section);
    setMenuOpen(false);
  }

  function openStudentWorkspace(student: AdvisorStudent): void {
    setSelectedStudentId(student.userId);
    setActiveSection("messages");
    setMenuOpen(false);
  }

  if (
    !isLoaded ||
    isLoadingRole ||
    (isSignedIn && role === null)
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FA] px-6">
        <div className="text-center">
          <Loader2
            aria-hidden="true"
            className="mx-auto h-8 w-8 animate-spin text-[#C8A24A]"
          />
          <p className="mt-4 text-sm font-black text-[#071526]">
            Opening advisor workspace
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Verifying your account permissions.
          </p>
        </div>
      </main>
    );
  }

  if (!isSignedIn || !isAdvisor) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#F4F7FA] text-[#071526]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 flex-col bg-[#071526] px-5 py-6 text-white lg:flex">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C8A24A] text-[#071526]">
              <GraduationCap
                aria-hidden="true"
                className="h-6 w-6"
              />
            </div>

            <div>
              <p className="text-sm font-black text-[#C8A24A]">
                Global Scholars
              </p>
              <p className="text-xs text-white/60">
                Advisor Dashboard
              </p>
            </div>
          </div>

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
                <p className="truncate text-sm font-black">
                  {advisorName}
                </p>
                <p className="truncate text-xs text-white/55">
                  {advisorEmail}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200">
              <ShieldCheck
                aria-hidden="true"
                className="h-4 w-4"
              />
              Advisor access verified
            </div>
          </div>

          <nav className="mt-7 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold transition",
                    isActive
                      ? "bg-[#C8A24A] text-[#071526]"
                      : "text-white/75 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <Icon
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto">
            <div className="rounded-3xl bg-white/10 p-5">
              <p className="text-sm font-black">
                Assigned caseload
              </p>
              <p className="mt-2 text-3xl font-black text-[#C8A24A]">
                {students.length}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/60">
                Active student assignment
                {students.length === 1 ? "" : "s"}.
              </p>
            </div>

            <SignOutButton redirectUrl="/">
              <button
                type="button"
                className="mt-5 flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut
                  aria-hidden="true"
                  className="h-5 w-5"
                />
                Log Out
              </button>
            </SignOutButton>
          </div>
        </aside>

        {menuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close advisor menu"
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-[#071526]/65 backdrop-blur-sm"
            />

            <aside className="relative flex h-full w-[min(88vw,22rem)] flex-col bg-[#071526] px-5 py-6 text-white shadow-2xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C8A24A] text-[#071526]">
                    <GraduationCap
                      aria-hidden="true"
                      className="h-6 w-6"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#C8A24A]">
                      Global Scholars
                    </p>
                    <p className="text-xs text-white/60">
                      Advisor Dashboard
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
                  aria-label="Close advisor menu"
                >
                  <X
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
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
                    <p className="truncate text-sm font-black">
                      {advisorName}
                    </p>
                    <p className="truncate text-xs text-white/55">
                      {advisorEmail}
                    </p>
                  </div>
                </div>
              </div>

              <nav className="mt-7 space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className={[
                        "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold",
                        isActive
                          ? "bg-[#C8A24A] text-[#071526]"
                          : "text-white/75",
                      ].join(" ")}
                    >
                      <Icon
                        aria-hidden="true"
                        className="h-5 w-5"
                      />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-auto">
                <SignOutButton redirectUrl="/">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold text-white/75"
                  >
                    <LogOut
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                    Log Out
                  </button>
                </SignOutButton>
              </div>
            </aside>
          </div>
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur-lg md:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 lg:hidden"
                  aria-label="Open advisor menu"
                >
                  <Menu
                    aria-hidden="true"
                    className="h-6 w-6"
                  />
                </button>

                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Welcome back
                  </p>
                  <h1 className="text-xl font-black text-[#071526] md:text-2xl">
                    Advisor Dashboard
                  </h1>
                </div>
              </div>

              <div className="hidden items-center gap-3 rounded-2xl bg-[#F4F7FA] px-3 py-2 sm:flex">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-10 w-10",
                    },
                  }}
                />
                <div className="max-w-44 pr-2">
                  <p className="truncate text-sm font-black">
                    {advisorName}
                  </p>
                  <p className="text-xs text-slate-500">
                    Advisor
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="w-full min-w-0 max-w-none flex-1 px-5 py-7 md:px-8 md:py-9">
            {roleError ? (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0"
                />
                <div>
                  <p className="font-black">
                    Role verification notice
                  </p>
                  <p className="mt-1 leading-6">
                    {roleError}
                  </p>
                </div>
              </div>
            ) : null}

            {studentsError ? (
              <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0"
                  />
                  <div>
                    <p className="font-black">
                      Students could not be loaded
                    </p>
                    <p className="mt-1 leading-6">
                      {studentsError}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void refreshStudents();
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white"
                  aria-label="Retry loading students"
                >
                  <RefreshCw
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                </button>
              </div>
            ) : null}

            {activeSection === "overview" ? (
              <section>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
                    Advisor workspace
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-[#071526]">
                    Manage your assigned scholars
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Review your active caseload and continue
                    conversations with the students assigned to you.
                  </p>
                </div>

                <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3F8] text-[#0F2747]">
                      <Users
                        aria-hidden="true"
                        className="h-6 w-6"
                      />
                    </div>
                    <p className="mt-5 text-sm font-bold text-slate-500">
                      Assigned students
                    </p>
                    <p className="mt-1 text-4xl font-black text-[#071526]">
                      {students.length}
                    </p>
                  </article>

                  <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF4CF] text-[#8A6A1F]">
                      <MessageCircle
                        aria-hidden="true"
                        className="h-6 w-6"
                      />
                    </div>
                    <p className="mt-5 text-sm font-bold text-slate-500">
                      Messaging access
                    </p>
                    <p className="mt-2 text-lg font-black text-[#071526]">
                      Ready
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Select a student to open their complete workspace.
                    </p>
                  </article>

                  <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:col-span-2 xl:col-span-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <ShieldCheck
                        aria-hidden="true"
                        className="h-6 w-6"
                      />
                    </div>
                    <p className="mt-5 text-sm font-bold text-slate-500">
                      Portal role
                    </p>
                    <p className="mt-2 text-lg font-black capitalize text-[#071526]">
                      {role}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Advisor permissions are active.
                    </p>
                  </article>
                </div>

                <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-[#071526]">
                        Recently assigned students
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Open a student record to manage their full workspace.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateTo("students")}
                      className="inline-flex items-center justify-center rounded-xl bg-[#0F2747] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#173B68]"
                    >
                      View all students
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {isLoadingStudents ? (
                      <div className="col-span-full flex min-h-40 items-center justify-center">
                        <Loader2
                          aria-hidden="true"
                          className="h-6 w-6 animate-spin text-[#C8A24A]"
                        />
                      </div>
                    ) : students.length === 0 ? (
                      <div className="col-span-full rounded-2xl bg-[#F8FAFC] p-8 text-center">
                        <UserRound
                          aria-hidden="true"
                          className="mx-auto h-8 w-8 text-slate-400"
                        />
                        <p className="mt-4 font-black text-[#071526]">
                          No students assigned yet
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Assigned students will appear here.
                        </p>
                      </div>
                    ) : (
                      students.slice(0, 4).map((student) => (
                        <button
                          key={student.userId}
                          type="button"
                          onClick={() => openStudentWorkspace(student)}
                          className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-[#C8A24A] hover:bg-[#FFFCF2]"
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F2747] text-sm font-black text-white">
                            {getInitials(student.displayName)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-black text-[#071526]">
                              {student.displayName}
                            </span>
                            <span className="mt-1 block truncate text-xs text-slate-500">
                              {student.email ?? "No email available"}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {activeSection === "students" ? (
              <section>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
                      Student caseload
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-[#071526]">
                      Assigned Students
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      Search your assignments and open a student’s
                      complete advising workspace.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void refreshStudents();
                    }}
                    disabled={isLoadingStudents}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-[#071526] transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    <RefreshCw
                      aria-hidden="true"
                      className={[
                        "h-4 w-4",
                        isLoadingStudents ? "animate-spin" : "",
                      ].join(" ")}
                    />
                    Refresh
                  </button>
                </div>

                <div className="mt-7 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                  <label className="relative block">
                    <span className="sr-only">
                      Search assigned students
                    </span>
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) =>
                        setSearchQuery(event.target.value)
                      }
                      placeholder="Search by student name or email"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-[#C8A24A] focus:ring-4 focus:ring-[#C8A24A]/10"
                    />
                  </label>

                  <div className="mt-6 space-y-3">
                    {isLoadingStudents ? (
                      <div className="flex min-h-64 items-center justify-center">
                        <Loader2
                          aria-hidden="true"
                          className="h-7 w-7 animate-spin text-[#C8A24A]"
                        />
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="rounded-2xl bg-[#F8FAFC] px-6 py-12 text-center">
                        <Users
                          aria-hidden="true"
                          className="mx-auto h-9 w-9 text-slate-400"
                        />
                        <p className="mt-4 font-black text-[#071526]">
                          No matching students
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try another name or email address.
                        </p>
                      </div>
                    ) : (
                      filteredStudents.map((student) => (
                        <article
                          key={student.userId}
                          className={[
                            "flex flex-col gap-4 rounded-2xl border p-4 transition sm:flex-row sm:items-center sm:justify-between",
                            selectedStudentId === student.userId
                              ? "border-[#C8A24A] bg-[#FFFCF2]"
                              : "border-slate-200",
                          ].join(" ")}
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F2747] text-sm font-black text-white">
                              {getInitials(student.displayName)}
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate font-black text-[#071526]">
                                {student.displayName}
                              </h3>
                              <p className="mt-1 truncate text-sm text-slate-500">
                                {student.email ??
                                  "No email available"}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-400">
                                Assigned{" "}
                                {formatAssignedDate(
                                  student.assignedAt,
                                )}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              openStudentWorkspace(student)
                            }
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0F2747] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#173B68]"
                          >
                            <UserRound
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            Open workspace
                          </button>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {activeSection === "messages" ? (
              <section>
                <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C8A24A]">
                        Active student
                      </p>
                      <h2 className="mt-2 text-xl font-black text-[#071526]">
                        {selectedStudent?.displayName ??
                          "Select an assigned student"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedStudent?.email ??
                          "Choose a student from your assigned caseload."}
                      </p>
                    </div>

                    <label className="block lg:w-80">
                      <span className="sr-only">
                        Select student
                      </span>
                      <select
                        value={selectedStudentId ?? ""}
                        onChange={(event) =>
                          setSelectedStudentId(
                            event.target.value || null,
                          )
                        }
                        className="h-12 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-bold text-[#071526] outline-none focus:border-[#C8A24A] focus:ring-4 focus:ring-[#C8A24A]/10"
                      >
                        {students.length === 0 ? (
                          <option value="">
                            No students assigned
                          </option>
                        ) : null}

                        {students.map((student) => (
                          <option
                            key={student.userId}
                            value={student.userId}
                          >
                            {student.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                {selectedStudent ? (
                  <StudentWorkspace student={selectedStudent} />
                ) : (
                  <div className="flex min-h-[32rem] flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-white px-6 text-center shadow-sm">
                    <UserRound
                      aria-hidden="true"
                      className="h-10 w-10 text-slate-400"
                    />
                    <h3 className="mt-5 text-xl font-black text-[#071526]">
                      Select a student
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                      Choose an assigned student before opening their
                      advising workspace.
                    </p>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
