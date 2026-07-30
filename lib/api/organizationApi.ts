import type { SupabaseClient } from "@supabase/supabase-js";

import { PlatformServiceError } from "@/lib/crm/platformErrors";
import {
  createRequestContext,
  reportError,
  responseHeaders,
  type RequestContext,
} from "@/lib/operations";

export interface OrganizationApiError {
  code: string;
  message: string;
}

export type OrganizationApiResponse<T> =
  { ok: true; data: T } | { ok: false; error: OrganizationApiError };

interface OrganizationApiOptions<T> {
  request: Request;
  route: string;
  userId: string | null;
  supabase?: SupabaseClient;
  requireAdmin?: boolean;
  operation: (supabase: SupabaseClient) => Promise<T>;
}

const STATUS_BY_CODE = {
  AUTHORIZATION_DENIED: 403,
  VALIDATION_FAILED: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVICE_UNAVAILABLE: 503,
  UNKNOWN: 500,
} as const;

function json<T>(
  context: RequestContext,
  body: OrganizationApiResponse<T>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: responseHeaders(context, {
      "Cache-Control": "private, no-store, max-age=0",
    }),
  });
}

async function requireAdministrator(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase
    .schema("crm")
    .rpc("current_profile_role");

  if (error) {
    throw new PlatformServiceError(
      "SERVICE_UNAVAILABLE",
      "Authorization could not be verified.",
      error,
    );
  }
  if (data !== "admin") {
    throw new PlatformServiceError(
      "AUTHORIZATION_DENIED",
      "Administrator access is required.",
    );
  }
}

export async function runOrganizationApi<T>({
  request,
  route,
  userId,
  supabase,
  requireAdmin = false,
  operation,
}: OrganizationApiOptions<T>): Promise<Response> {
  const context = createRequestContext(request, route);

  if (!userId || !supabase) {
    return json(
      context,
      {
        ok: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication is required.",
        },
      },
      401,
    );
  }

  try {
    if (requireAdmin) await requireAdministrator(supabase);
    const data = await operation(supabase);
    return json(context, { ok: true, data });
  } catch (error) {
    const serviceError =
      error instanceof PlatformServiceError
        ? error
        : new PlatformServiceError(
            "UNKNOWN",
            "The organization request could not be completed.",
            error,
          );
    const status = STATUS_BY_CODE[serviceError.code];

    if (status >= 500) {
      await reportError({
        error: serviceError.cause ?? serviceError,
        context: {
          ...context,
          userId,
          errorCode: serviceError.code,
        },
      });
    }

    return json(
      context,
      {
        ok: false,
        error: {
          code: serviceError.code,
          message:
            status >= 500
              ? "The organization request could not be completed."
              : serviceError.message,
        },
      },
      status,
    );
  }
}

export async function parseJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new PlatformServiceError(
      "VALIDATION_FAILED",
      "Request body must contain valid JSON.",
    );
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PlatformServiceError(
      "VALIDATION_FAILED",
      "Request body must be a JSON object.",
    );
  }
  return value as Record<string, unknown>;
}

export function requiredString(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = payload[key];
  if (typeof value !== "string") {
    throw new PlatformServiceError(
      "VALIDATION_FAILED",
      `${key} must be a string.`,
    );
  }
  return value;
}

export function optionalString(
  payload: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const value = payload[key];
  if (value === undefined || value === null || typeof value === "string") {
    return value;
  }
  throw new PlatformServiceError(
    "VALIDATION_FAILED",
    `${key} must be a string or null.`,
  );
}

export function optionalBoolean(
  payload: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = payload[key];
  if (value === undefined || typeof value === "boolean") return value;
  throw new PlatformServiceError(
    "VALIDATION_FAILED",
    `${key} must be a boolean.`,
  );
}
