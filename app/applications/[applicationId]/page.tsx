import type { Metadata } from "next";
import ApplicationDetailsPage from "@/features/applications/components/ApplicationDetailsPage";

export const metadata: Metadata = { title: "Application Details" };
export default async function ApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { applicationId } = await params;
  const query = await searchParams;
  const returnTo =
    typeof query.returnTo === "string" &&
    query.returnTo.startsWith("/advisor-dashboard")
      ? query.returnTo
      : undefined;
  return <ApplicationDetailsPage id={applicationId} returnTo={returnTo} />;
}
