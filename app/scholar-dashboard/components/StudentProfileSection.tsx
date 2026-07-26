"use client";

import {
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  Loader2,
  MapPin,
  Save,
  UserRound,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import type {
  CompleteStudentProfile,
  StudentProfileInput,
} from "../types/dashboard";

interface StudentProfileSectionProps {
  profile: CompleteStudentProfile;
  isSaving: boolean;
  error: string;
  successMessage: string;
  onSave: (input: StudentProfileInput) => Promise<void>;
}

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

interface FormState {
  phone: string;
  dateOfBirth: string;
  nationality: string;
  currentCountry: string;
  passportNumber: string;
  highestQualification: string;
  institution: string;
  gpa: string;
  graduationYear: string;
  englishTestType: string;
  englishTestScore: string;
  preferredDestinationCountry: string;
  preferredDegree: string;
  preferredProgram: string;
  intendedIntake: string;
  budget: string;
  budgetCurrency: string;
}

const inputClassName =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-semibold text-[#071526] outline-none transition placeholder:text-slate-400 focus:border-[#C8A24A] focus:bg-white focus:ring-4 focus:ring-[#C8A24A]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#071526]">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-xs leading-5 text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function initialState(
  profile: CompleteStudentProfile,
): FormState {
  const student = profile.student;

  return {
    phone: student?.phone ?? "",
    dateOfBirth: student?.date_of_birth ?? "",
    nationality: student?.nationality ?? "",
    currentCountry: student?.current_country ?? "",
    passportNumber: student?.passport_number ?? "",
    highestQualification: student?.highest_qualification ?? "",
    institution: student?.institution ?? "",
    gpa: student?.gpa?.toString() ?? "",
    graduationYear: student?.graduation_year?.toString() ?? "",
    englishTestType: student?.english_test_type ?? "",
    englishTestScore: student?.english_test_score?.toString() ?? "",
    preferredDestinationCountry:
      student?.preferred_destination_country ?? "",
    preferredDegree: student?.preferred_degree ?? "",
    preferredProgram: student?.preferred_program ?? "",
    intendedIntake: student?.intended_intake ?? "",
    budget: student?.budget?.toString() ?? "",
    budgetCurrency: student?.budget_currency ?? "",
  };
}

export default function StudentProfileSection({
  profile,
  isSaving,
  error,
  successMessage,
  onSave,
}: StudentProfileSectionProps) {
  const [form, setForm] = useState<FormState>(() =>
    initialState(profile),
  );

  function updateField(
    field: keyof FormState,
    value: string,
  ): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await onSave({
      phone: form.phone,
      date_of_birth: form.dateOfBirth,
      nationality: form.nationality,
      current_country: form.currentCountry,
      passport_number: form.passportNumber,
      highest_qualification: form.highestQualification,
      institution: form.institution,
      gpa: optionalNumber(form.gpa),
      graduation_year: optionalNumber(form.graduationYear),
      english_test_type: form.englishTestType,
      english_test_score: optionalNumber(form.englishTestScore),
      preferred_destination_country:
        form.preferredDestinationCountry,
      preferred_degree: form.preferredDegree,
      preferred_program: form.preferredProgram,
      intended_intake: form.intendedIntake,
      budget: optionalNumber(form.budget),
      budget_currency: form.budget ? form.budgetCurrency : null,
    });
  }

  return (
    <section id="profile" className="scroll-mt-28 mt-8">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#071526] to-[#0F2747] px-6 py-7 text-white md:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
                Student Profile
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Your academic foundation
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                Keep your personal, academic, and study preference
                information current so your advisor can guide you accurately.
              </p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C8A24A] text-[#071526]">
              <UserRound size={28} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          {error ? (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            >
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div
              role="status"
              className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            >
              <CheckCircle2 size={18} />
              {successMessage}
            </div>
          ) : null}

          <div>
            <div className="flex items-center gap-3">
              <UserRound className="text-[#C8A24A]" size={22} />
              <h3 className="text-xl font-black">Personal Information</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Name and email come from your secure CRM identity profile.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Name">
                <input
                  value={profile.identity.display_name}
                  disabled
                  className={inputClassName}
                />
              </Field>
              <Field label="Email">
                <input
                  value={profile.identity.email ?? ""}
                  disabled
                  className={inputClassName}
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateField("phone", event.target.value)
                  }
                  placeholder="+1 555 123 4567"
                  maxLength={30}
                  className={inputClassName}
                />
              </Field>
              <Field label="Date of Birth">
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) =>
                    updateField("dateOfBirth", event.target.value)
                  }
                  max={new Date().toISOString().slice(0, 10)}
                  className={inputClassName}
                />
              </Field>
              <Field label="Nationality">
                <input
                  value={form.nationality}
                  onChange={(event) =>
                    updateField("nationality", event.target.value)
                  }
                  maxLength={100}
                  className={inputClassName}
                />
              </Field>
              <Field label="Current Country">
                <input
                  value={form.currentCountry}
                  onChange={(event) =>
                    updateField("currentCountry", event.target.value)
                  }
                  maxLength={100}
                  className={inputClassName}
                />
              </Field>
              <Field
                label="Passport Number"
                hint="Optional. Leave blank if you do not have a passport yet."
              >
                <input
                  value={form.passportNumber}
                  onChange={(event) =>
                    updateField("passportNumber", event.target.value)
                  }
                  maxLength={50}
                  autoComplete="off"
                  className={inputClassName}
                />
              </Field>
            </div>
          </div>

          <div className="my-8 h-px bg-slate-200" />

          <div>
            <div className="flex items-center gap-3">
              <GraduationCap className="text-[#C8A24A]" size={24} />
              <h3 className="text-xl font-black">Academic Information</h3>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Highest Qualification">
                <input
                  value={form.highestQualification}
                  onChange={(event) =>
                    updateField(
                      "highestQualification",
                      event.target.value,
                    )
                  }
                  maxLength={150}
                  placeholder="High School Diploma, Bachelor's Degree..."
                  className={inputClassName}
                />
              </Field>
              <Field label="Institution">
                <input
                  value={form.institution}
                  onChange={(event) =>
                    updateField("institution", event.target.value)
                  }
                  maxLength={200}
                  className={inputClassName}
                />
              </Field>
              <Field
                label="GPA / Academic Average"
                hint="Enter the result on your institution's original scale."
              >
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.gpa}
                  onChange={(event) =>
                    updateField("gpa", event.target.value)
                  }
                  className={inputClassName}
                />
              </Field>
              <Field label="Graduation Year">
                <input
                  type="number"
                  min="1950"
                  max="2100"
                  value={form.graduationYear}
                  onChange={(event) =>
                    updateField("graduationYear", event.target.value)
                  }
                  className={inputClassName}
                />
              </Field>
              <Field label="English Test">
                <select
                  value={form.englishTestType}
                  onChange={(event) =>
                    updateField("englishTestType", event.target.value)
                  }
                  className={inputClassName}
                >
                  <option value="">Select a test</option>
                  <option>IELTS</option>
                  <option>TOEFL</option>
                  <option>PTE Academic</option>
                  <option>Duolingo English Test</option>
                  <option>Cambridge English</option>
                  <option>Other</option>
                  <option>Not taken</option>
                </select>
              </Field>
              <Field label="English Test Score">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.01"
                  value={form.englishTestScore}
                  onChange={(event) =>
                    updateField("englishTestScore", event.target.value)
                  }
                  disabled={
                    !form.englishTestType ||
                    form.englishTestType === "Not taken"
                  }
                  className={inputClassName}
                />
              </Field>
            </div>
          </div>

          <div className="my-8 h-px bg-slate-200" />

          <div>
            <div className="flex items-center gap-3">
              <MapPin className="text-[#C8A24A]" size={22} />
              <h3 className="text-xl font-black">Study Goals</h3>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Preferred Destination">
                <input
                  value={form.preferredDestinationCountry}
                  onChange={(event) =>
                    updateField(
                      "preferredDestinationCountry",
                      event.target.value,
                    )
                  }
                  maxLength={100}
                  className={inputClassName}
                />
              </Field>
              <Field label="Preferred Degree">
                <input
                  value={form.preferredDegree}
                  onChange={(event) =>
                    updateField("preferredDegree", event.target.value)
                  }
                  maxLength={100}
                  placeholder="Bachelor's, Master's, Diploma..."
                  className={inputClassName}
                />
              </Field>
              <Field label="Preferred Program">
                <div className="relative">
                  <BookOpen
                    size={18}
                    className="pointer-events-none absolute left-4 top-[1.9rem] text-slate-400"
                  />
                  <input
                    value={form.preferredProgram}
                    onChange={(event) =>
                      updateField(
                        "preferredProgram",
                        event.target.value,
                      )
                    }
                    maxLength={200}
                    className={`${inputClassName} pl-11`}
                  />
                </div>
              </Field>
              <Field label="Intended Intake">
                <input
                  value={form.intendedIntake}
                  onChange={(event) =>
                    updateField("intendedIntake", event.target.value)
                  }
                  maxLength={100}
                  placeholder="Fall 2027"
                  className={inputClassName}
                />
              </Field>
              <Field label="Budget">
                <div className="relative">
                  <CircleDollarSign
                    size={18}
                    className="pointer-events-none absolute left-4 top-[1.9rem] text-slate-400"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.budget}
                    onChange={(event) =>
                      updateField("budget", event.target.value)
                    }
                    className={`${inputClassName} pl-11`}
                  />
                </div>
              </Field>
              <Field label="Budget Currency">
                <input
                  value={form.budgetCurrency}
                  onChange={(event) =>
                    updateField(
                      "budgetCurrency",
                      event.target.value.toUpperCase(),
                    )
                  }
                  required={Boolean(form.budget)}
                  disabled={!form.budget}
                  minLength={3}
                  maxLength={3}
                  pattern="[A-Z]{3}"
                  placeholder="USD"
                  className={inputClassName}
                />
              </Field>
            </div>
          </div>

          <div className="mt-8 flex justify-end border-t border-slate-200 pt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-[#C8A24A] px-6 py-3.5 text-sm font-black text-[#071526] transition hover:bg-[#D8B85F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
