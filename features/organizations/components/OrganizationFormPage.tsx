"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  createOrganization,
  getOrganization,
  updateOrganization,
} from "../api";
import type { Organization, OrganizationFormValues } from "../types";
import OrganizationForm from "./OrganizationForm";
import OrganizationShell from "./OrganizationShell";
import OrganizationToast from "./OrganizationToast";

const EMPTY_VALUES: OrganizationFormValues = {
  name: "",
  slug: "",
  organizationType: "partner_school",
  email: "",
  phone: "",
  website: "",
  address: "",
};

function valuesFromOrganization(
  organization: Organization,
): OrganizationFormValues {
  return {
    name: organization.name,
    slug: organization.slug,
    organizationType: organization.organization_type,
    email: organization.email ?? "",
    phone: organization.phone ?? "",
    website: organization.website ?? "",
    address: organization.address ?? "",
  };
}

export default function OrganizationFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getOrganization(id)
      .then((value) => {
        if (active) setOrganization(value);
      })
      .catch((cause: unknown) => {
        if (active) {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : "Organization could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const initialValues = useMemo(
    () => (organization ? valuesFromOrganization(organization) : EMPTY_VALUES),
    [organization],
  );

  async function save(values: OrganizationFormValues) {
    try {
      let saved: Organization;
      if (id && organization) {
        const original = valuesFromOrganization(organization);
        const changes = Object.fromEntries(
          Object.entries(values).filter(
            ([key, value]) =>
              value !== original[key as keyof OrganizationFormValues],
          ),
        ) as Partial<OrganizationFormValues>;
        if (Object.keys(changes).length === 0) {
          setToast({ message: "No changes to save.", tone: "success" });
          return;
        }
        saved = await updateOrganization(id, changes);
      } else {
        saved = await createOrganization(values);
      }
      setToast({
        message: id ? "Organization updated." : "Organization created.",
        tone: "success",
      });
      window.setTimeout(() => {
        router.push(`/organizations/${saved.id}`);
      }, 500);
    } catch (cause) {
      setToast({
        message:
          cause instanceof Error
            ? cause.message
            : "Organization could not be saved.",
        tone: "error",
      });
    }
  }

  return (
    <OrganizationShell
      title={id ? "Edit organization" : "Create organization"}
      description={
        id
          ? "Update only the organization information that has changed."
          : "Add a customer organization to Global Scholars OS."
      }
      backHref={id ? `/organizations/${id}` : "/organizations"}
    >
      {isLoading ? (
        <div
          aria-label="Loading organization form"
          className="h-[32rem] animate-pulse rounded-[2rem] bg-slate-200"
        />
      ) : loadError ? (
        <div
          role="alert"
          className="rounded-3xl border border-rose-200 bg-white p-8 text-rose-800"
        >
          {loadError}
        </div>
      ) : (
        <OrganizationForm
          key={organization?.updated_at ?? "new"}
          initialValues={initialValues}
          submitLabel={id ? "Save changes" : "Create organization"}
          onSubmit={save}
        />
      )}
      {toast ? <OrganizationToast {...toast} /> : null}
    </OrganizationShell>
  );
}
