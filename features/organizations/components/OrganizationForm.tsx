"use client";

import { Loader2, Save } from "lucide-react";
import { useState } from "react";

import type { OrganizationFormValues, OrganizationType } from "../types";
import {
  slugifyOrganizationName,
  validateOrganizationForm,
  type OrganizationFormErrors,
} from "../validation";

const TYPES: Array<{ value: OrganizationType; label: string }> = [
  { value: "partner_school", label: "Partner school" },
  { value: "advising_agency", label: "Advising agency" },
  { value: "sponsor", label: "Sponsor" },
  { value: "operating_unit", label: "Operating unit" },
];

const inputClass =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#C8A24A] focus:ring-4 focus:ring-[#C8A24A]/10 disabled:bg-slate-100";

export default function OrganizationForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues: OrganizationFormValues;
  submitLabel: string;
  onSubmit: (values: OrganizationFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<OrganizationFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValues.slug));

  function update<K extends keyof OrganizationFormValues>(
    key: K,
    value: OrganizationFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextValues = {
      ...values,
      name: values.name.trim(),
      slug: values.slug.trim().toLowerCase(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      website: values.website.trim(),
      address: values.address.trim(),
    };
    const nextErrors = validateOrganizationForm(nextValues);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await onSubmit(nextValues);
    } finally {
      setIsSaving(false);
    }
  }

  function fieldError(key: keyof OrganizationFormValues) {
    return errors[key] ? (
      <p
        id={`${key}-error`}
        className="mt-2 text-sm font-semibold text-rose-700"
      >
        {errors[key]}
      </p>
    ) : null;
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-8"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <label className="block text-sm font-black text-[#071526]">
          Name <span className="text-rose-600">*</span>
          <input
            value={values.name}
            disabled={isSaving}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            onChange={(event) => {
              const name = event.target.value;
              update("name", name);
              if (!slugTouched) update("slug", slugifyOrganizationName(name));
            }}
            className={inputClass}
            autoComplete="organization"
          />
          {fieldError("name")}
        </label>

        <label className="block text-sm font-black text-[#071526]">
          Slug <span className="text-rose-600">*</span>
          <input
            value={values.slug}
            disabled={isSaving}
            aria-invalid={Boolean(errors.slug)}
            aria-describedby={errors.slug ? "slug-error" : undefined}
            onChange={(event) => {
              setSlugTouched(true);
              update("slug", event.target.value.toLowerCase());
            }}
            className={inputClass}
            autoComplete="off"
          />
          {fieldError("slug")}
        </label>

        <label className="block text-sm font-black text-[#071526]">
          Organization type <span className="text-rose-600">*</span>
          <select
            value={values.organizationType}
            disabled={isSaving}
            onChange={(event) =>
              update("organizationType", event.target.value as OrganizationType)
            }
            className={inputClass}
          >
            {TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-black text-[#071526]">
          Email
          <input
            type="email"
            value={values.email}
            disabled={isSaving}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            onChange={(event) => update("email", event.target.value)}
            className={inputClass}
            autoComplete="email"
          />
          {fieldError("email")}
        </label>

        <label className="block text-sm font-black text-[#071526]">
          Phone
          <input
            type="tel"
            value={values.phone}
            disabled={isSaving}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            onChange={(event) => update("phone", event.target.value)}
            className={inputClass}
            autoComplete="tel"
          />
          {fieldError("phone")}
        </label>

        <label className="block text-sm font-black text-[#071526]">
          Website
          <input
            type="url"
            value={values.website}
            disabled={isSaving}
            aria-invalid={Boolean(errors.website)}
            aria-describedby={errors.website ? "website-error" : undefined}
            onChange={(event) => update("website", event.target.value)}
            className={inputClass}
            placeholder="https://example.org"
            autoComplete="url"
          />
          {fieldError("website")}
        </label>

        <label className="block text-sm font-black text-[#071526] md:col-span-2">
          Address
          <textarea
            value={values.address}
            disabled={isSaving}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? "address-error" : undefined}
            onChange={(event) => update("address", event.target.value)}
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#C8A24A] focus:ring-4 focus:ring-[#C8A24A]/10 disabled:bg-slate-100"
            autoComplete="street-address"
          />
          {fieldError("address")}
        </label>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-[#0F2747] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173B68] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#C8A24A]/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {isSaving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
