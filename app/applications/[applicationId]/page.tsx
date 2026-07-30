import type { Metadata } from "next";
import ApplicationDetailsPage from "@/features/applications/components/ApplicationDetailsPage";

export const metadata: Metadata = { title: "Application Details" };
export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  return <ApplicationDetailsPage id={applicationId} />;
}
