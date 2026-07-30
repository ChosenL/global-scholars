import type {
  ApplicationStatus,
  ApplicationTimelineEvent,
  StudentApplication,
} from "./types";

interface SuccessResponse<T> {
  ok: true;
  data: T;
}
interface ErrorResponse {
  ok: false;
  error: { code: string; message: string };
}

export class ApplicationApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApplicationApiError";
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
    throw new ApplicationApiError(error.code, error.message, response.status);
  }
  return body.data;
}

export function listApplications(options: {
  status?: ApplicationStatus;
  limit: number;
  offset: number;
}) {
  const params = new URLSearchParams({
    limit: String(options.limit),
    offset: String(options.offset),
  });
  if (options.status) params.set("status", options.status);
  return apiRequest<StudentApplication[]>(`/api/applications?${params}`);
}
export function getApplication(id: string) {
  return apiRequest<StudentApplication>(
    `/api/applications/${encodeURIComponent(id)}`,
  );
}
export function changeApplicationStatus(
  id: string,
  status: ApplicationStatus,
  reason: string | null,
) {
  return apiRequest<StudentApplication>(
    `/api/applications/${encodeURIComponent(id)}/status`,
    { method: "POST", body: JSON.stringify({ status, reason }) },
  );
}
export function updateApplicationFinancials(
  id: string,
  input: {
    tuitionAmount: number | null;
    tuitionCurrency: string | null;
    tuitionSource: string | null;
  },
) {
  return apiRequest<StudentApplication>(
    `/api/applications/${encodeURIComponent(id)}/financials`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
export function archiveApplication(id: string) {
  return apiRequest<StudentApplication>(
    `/api/applications/${encodeURIComponent(id)}/archive`,
    { method: "POST" },
  );
}
export function listApplicationTimeline(id: string) {
  return apiRequest<ApplicationTimelineEvent[]>(
    `/api/applications/${encodeURIComponent(id)}/timeline`,
  );
}
