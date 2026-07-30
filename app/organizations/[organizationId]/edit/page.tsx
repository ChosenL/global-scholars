import type { Metadata } from "next";

import OrganizationFormPage from "@/features/organizations/components/OrganizationFormPage";

export const metadata: Metadata = {
  title: "Edit Organization",
};

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  return <OrganizationFormPage id={organizationId} />;
}
