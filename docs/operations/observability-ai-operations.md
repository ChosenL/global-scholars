# Observability and AI Operations

## Architecture

All API routes create a UUID request ID and correlation ID. Valid inbound
`X-Request-ID` and `X-Correlation-ID` values are propagated; untrusted values
are replaced. Responses return both identifiers.

Structured log fields include timestamp, level, message, route, operation,
request ID, correlation ID, status, and duration. The provider-agnostic
`ErrorReporter` interface can later forward redacted reports to Sentry, Datadog,
OpenTelemetry, or another approved provider. The default reporter emits
structured server logs.

## Redaction

Redaction is recursive, depth/size bounded, and applied before all operations
logs or error reports. Sensitive keys include authorization, cookies, tokens,
secrets, passwords, passport/SSN data, email, phone, prompts, authorized context,
signed URLs, and storage paths. Email addresses, bearer values, and secret URL
parameters are also removed from strings.

Never add raw prompts, CRM records, headers, signed links, provider requests, or
database error objects directly to logs. New providers must receive already
redacted `ErrorReport` objects.

## Distributed rate limits

PostgreSQL stores fixed-window counters in `crm.operational_rate_limits`.
Identifiers are salted SHA-256 hashes; raw IP addresses and Clerk/CRM IDs are
never stored.

Default limits:

- public chat: 20 requests per network key per minute;
- CRM AI: 10 requests per authenticated subject per minute.

The anonymous rate-limit RPC is an intentional narrow exception: it accepts only
an enumerated scope, a 64-character SHA-256 value, and bounded numeric limits.
It exposes no identity or CRM data.

## AI safeguards

- `AI_OPERATIONS_ENABLED=false` disables provider calls immediately.
- Each provider operation has an abort timeout (default 15 seconds).
- Retryable timeout, 408, 409, 429, and 5xx failures retry once with bounded
  exponential backoff.
- A shared circuit opens after five recorded failures in five minutes.
- Each CRM profile defaults to 50 AI requests and 100,000 tokens per UTC day.
- Daily requests, input/output tokens, and failure counts are stored in
  `crm.ai_daily_usage`.
- Existing invocation audit records remain the source for request details and
  provider usage; prompts and outputs are not stored.

## Configuration

Required:

- `OPERATIONS_HASH_SALT` (server-only; `OPENAI_SAFETY_SALT` is a supported
  transition fallback)
- `AI_OPERATIONS_ENABLED`
- `AI_PROVIDER_TIMEOUT_MS`
- `AI_PROVIDER_MAX_RETRIES`
- `PUBLIC_CHAT_RATE_LIMIT`
- `AI_RATE_LIMIT_PER_MINUTE`
- `AI_DAILY_REQUEST_LIMIT`
- `AI_DAILY_TOKEN_LIMIT`
- `AI_CIRCUIT_FAILURE_THRESHOLD`
- `AI_CIRCUIT_WINDOW_MINUTES`

## Future provider integration

An approved monitoring provider should implement `ErrorReporter.capture` and be
registered during server initialization. Add release/environment tags without
including secret values or personal data.

Recommended alerts:

- AI circuit opened: warning immediately, critical after 15 minutes.
- AI provider failure rate above 10% for five minutes.
- 95th percentile API latency above two seconds for ten minutes.
- HTTP 5xx rate above 2% for five minutes.
- rate-limited traffic above 5% for ten minutes.
- daily AI token use above 70%, 85%, and 100% of budget.
- health endpoint degraded for two consecutive probes.

Escalation ownership and provider-specific routing remain required before
staging.
