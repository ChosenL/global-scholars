import type { Metadata } from "next";

import OrganizationDetailsPage from "@/features/organizations/components/OrganizationDetailsPage";

export const metadata: Metadata = {
  title: "Organization Details",
};

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  return <OrganizationDetailsPage id={organizationId} />;
}
