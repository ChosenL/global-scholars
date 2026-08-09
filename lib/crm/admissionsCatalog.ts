import type { SupabaseClient } from "@supabase/supabase-js";

import { requireCrmUuid } from "./validation";

export interface Country {
  id: string;
  iso_code: string;
  name: string;
  default_currency: string | null;
  is_active: boolean;
}

export interface University {
  id: string;
  country_id: string;
  name: string;
  slug: string;
  institution_type: string | null;
  website_url: string | null;
  is_active: boolean;
}

export async function searchUniversities(
  supabase: SupabaseClient,
  query: string,
  limit = 20,
): Promise<University[]> {
  const normalized = query.trim().slice(0, 100);
  const safeLimit = Number.isInteger(limit)
    ? Math.min(Math.max(limit, 1), 50)
    : 20;
  let request = supabase
    .schema("crm")
    .from("universities")
    .select("id,country_id,name,slug,institution_type,website_url,is_active")
    .eq("is_active", true);
  if (normalized)
    request = request.ilike(
      "name",
      `%${normalized.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
    );
  const { data, error } = await request
    .order("name")
    .order("id")
    .limit(safeLimit);
  if (error) throw error;
  return (data ?? []) as University[];
}

export interface Program {
  id: string;
  university_id: string;
  faculty_id: string | null;
  name: string;
  program_code: string | null;
  credential_level: string;
  duration_months: number | null;
  description: string | null;
  is_active: boolean;
}

export interface Intake {
  id: string;
  program_id: string;
  campus_id: string;
  name: string;
  start_date: string;
  application_deadline: string | null;
  international_deadline: string | null;
  capacity: number | null;
  status: "planned" | "open" | "closed" | "cancelled";
}

export async function fetchCountries(
  supabase: SupabaseClient,
): Promise<Country[]> {
  const { data, error } = await supabase
    .schema("crm")
    .from("countries")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Country[];
}

export async function fetchUniversityPrograms(
  supabase: SupabaseClient,
  universityId: string,
): Promise<Program[]> {
  const { data, error } = await supabase
    .schema("crm")
    .from("programs")
    .select("*")
    .eq("university_id", requireCrmUuid(universityId, "University"))
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Program[];
}

export async function searchPrograms(
  supabase: SupabaseClient,
  universityId: string,
  query: string,
  limit = 20,
): Promise<Program[]> {
  const normalized = query.trim().slice(0, 100);
  const safeLimit = Number.isInteger(limit)
    ? Math.min(Math.max(limit, 1), 50)
    : 20;
  let request = supabase
    .schema("crm")
    .from("programs")
    .select(
      "id,name,program_code,credential_level,university_id,duration_months,is_active",
    )
    .eq("university_id", requireCrmUuid(universityId, "University"))
    .eq("is_active", true);
  if (normalized)
    request = request.ilike(
      "name",
      `%${normalized.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
    );
  const { data, error } = await request
    .order("name")
    .order("id")
    .limit(safeLimit);
  if (error) throw error;
  return (data ?? []) as Program[];
}

export async function fetchOpenIntakes(
  supabase: SupabaseClient,
  programId: string,
): Promise<Intake[]> {
  const { data, error } = await supabase
    .schema("crm")
    .from("intakes")
    .select("*")
    .eq("program_id", requireCrmUuid(programId, "Program"))
    .eq("status", "open")
    .order("start_date");
  if (error) throw error;
  return (data ?? []) as Intake[];
}

export async function listOpenIntakes(
  supabase: SupabaseClient,
  programId: string,
): Promise<Intake[]> {
  const { data, error } = await supabase
    .schema("crm")
    .from("intakes")
    .select(
      "id,name,program_id,campus_id,start_date,application_deadline,international_deadline,status",
    )
    .eq("program_id", requireCrmUuid(programId, "Program"))
    .eq("status", "open")
    .order("start_date")
    .order("id")
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Intake[];
}
