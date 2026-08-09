import type { Metadata } from "next";
import ApplicationListPage, {
  type InitialApplicationSelection,
} from "@/features/applications/components/ApplicationListPage";

export const metadata: Metadata = {
  title: "Student Applications",
  description: "Manage student university applications.",
};
const value = (input: string | string[] | undefined) =>
  typeof input === "string" ? input : "";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialSelection: InitialApplicationSelection | undefined =
    params.start === "1" &&
    value(params.studentProfileId) &&
    value(params.universityId) &&
    value(params.programId)
      ? {
          studentProfileId: value(params.studentProfileId),
          universityId: value(params.universityId),
          universityName: value(params.universityName),
          programId: value(params.programId),
          programName: value(params.programName),
          credentialLevel: value(params.credentialLevel),
        }
      : undefined;
  return <ApplicationListPage initialSelection={initialSelection} />;
}
