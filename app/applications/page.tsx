import type { Metadata } from "next";
import ApplicationListPage from "@/features/applications/components/ApplicationListPage";

export const metadata: Metadata = {
  title: "Student Applications",
  description: "Manage student university applications.",
};
export default function ApplicationsPage() {
  return <ApplicationListPage />;
}
