import { randomUUID } from "node:crypto";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface RequestContext {
  [key: string]: unknown;
  requestId: string;
  correlationId: string;
  route: string;
  startedAt: number;
}

export function createRequestContext(request: Request, route: string): RequestContext {
  const suppliedRequestId = request.headers.get("x-request-id");
  const requestId = suppliedRequestId && uuidPattern.test(suppliedRequestId)
    ? suppliedRequestId
    : randomUUID();
  const suppliedCorrelationId = request.headers.get("x-correlation-id");
  return {
    requestId,
    correlationId: suppliedCorrelationId && uuidPattern.test(suppliedCorrelationId)
      ? suppliedCorrelationId
      : requestId,
    route,
    startedAt: Date.now(),
  };
}

export function responseHeaders(
  context: RequestContext,
  base: HeadersInit = {},
): Headers {
  const headers = new Headers(base);
  headers.set("X-Request-ID", context.requestId);
  headers.set("X-Correlation-ID", context.correlationId);
  return headers;
}
