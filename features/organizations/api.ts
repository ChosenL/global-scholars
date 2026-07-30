import type {
  Organization,
  OrganizationAdvisor,
  OrganizationFormValues,
  OrganizationStudent,
} from "./types";

interface SuccessResponse<T> {
  ok: true;
  data: T;
}

interface ErrorResponse {
  ok: false;
  error: { code: string; message: string };
}

export class OrganizationApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "OrganizationApiError";
  }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = (await response.json()) as SuccessResponse<T> | ErrorResponse;
  if (!response.ok || !body.ok) {
    const error = body.ok
      ? {
          code: "REQUEST_FAILED",
          message: "The request could not be completed.",
        }
      : body.error;
    throw new OrganizationApiError(error.code, error.message, response.status);
  }
  return body.data;
}

export function listOrganizations(options: {
  search?: string;
  limit: number;
  offset: number;
}): Promise<Organization[]> {
  const params = new URLSearchParams({
    limit: String(options.limit),
    offset: String(options.offset),
  });
  if (options.search?.trim()) params.set("search", options.search.trim());
  return apiRequest(`/api/organizations?${params}`);
}

export function getOrganization(id: string): Promise<Organization> {
  return apiRequest(`/api/organizations/${encodeURIComponent(id)}`);
}

export function getOrganizationAdvisors(
  id: string,
): Promise<OrganizationAdvisor[]> {
  return apiRequest(`/api/organizations/${encodeURIComponent(id)}/advisors`);
}

export function getOrganizationStudents(
  id: string,
): Promise<OrganizationStudent[]> {
  return apiRequest(`/api/organizations/${encodeURIComponent(id)}/students`);
}

function toPayload(values: OrganizationFormValues) {
  return {
    name: values.name,
    slug: values.slug,
    organizationType: values.organizationType,
    email: values.email || null,
    phone: values.phone || null,
    website: values.website || null,
    address: values.address || null,
  };
}

export function createOrganization(
  values: OrganizationFormValues,
): Promise<Organization> {
  return apiRequest("/api/organizations", {
    method: "POST",
    body: JSON.stringify(toPayload(values)),
  });
}

export function updateOrganization(
  id: string,
  values: Partial<OrganizationFormValues>,
): Promise<Organization> {
  return apiRequest(`/api/organizations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function archiveOrganization(id: string): Promise<Organization> {
  return apiRequest(`/api/organizations/${encodeURIComponent(id)}/archive`, {
    method: "POST",
  });
}
