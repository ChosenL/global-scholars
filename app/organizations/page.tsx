import type { Metadata } from "next";

import OrganizationListPage from "@/features/organizations/components/OrganizationListPage";

export const metadata: Metadata = {
  title: "Organizations",
  description: "Manage Global Scholars OS customer organizations.",
};

export default function OrganizationsPage() {
  return <OrganizationListPage />;
}
