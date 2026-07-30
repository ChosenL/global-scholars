import type { Database } from "@/lib/supabase/types";

export type Organization = Database["crm"]["Tables"]["organizations"]["Row"];
export type OrganizationAdvisor =
  Database["crm"]["Tables"]["organization_advisors"]["Row"];
export type OrganizationStudent =
  Database["crm"]["Tables"]["organization_students"]["Row"];
export type OrganizationType = Organization["organization_type"];

export interface OrganizationFormValues {
  name: string;
  slug: string;
  organizationType: OrganizationType;
  email: string;
  phone: string;
  website: string;
  address: string;
}

export interface OrganizationSummary extends Organization {
  advisorCount: number;
  studentCount: number;
}
