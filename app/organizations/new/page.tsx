import type { Metadata } from "next";

import OrganizationFormPage from "@/features/organizations/components/OrganizationFormPage";

export const metadata: Metadata = {
  title: "Create Organization",
};

export default function CreateOrganizationPage() {
  return <OrganizationFormPage />;
}
