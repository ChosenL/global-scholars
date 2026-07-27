export class AiOperationsDisabledError extends Error {}
export class AiProviderTimeoutError extends Error {}

type ProviderCall<T> = (signal: AbortSignal) => Promise<T>;

function isRetryable(error: unknown): boolean {
  if (error instanceof AiProviderTimeoutError) return true;
  if (!error || typeof error !== "object") return false;
  const status = "status" in error ? Number(error.status) : 0;
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

export async function executeAiProviderCall<T>(
  operation: string,
  call: ProviderCall<T>,
  options?: { timeoutMs?: number; maxRetries?: number },
): Promise<T> {
  if (process.env.AI_OPERATIONS_ENABLED?.toLowerCase() === "false") {
    throw new AiOperationsDisabledError("AI operations are disabled.");
  }
  const timeoutMs = options?.timeoutMs ?? Number(process.env.AI_PROVIDER_TIMEOUT_MS || 15000);
  const maxRetries = options?.maxRetries ?? Number(process.env.AI_PROVIDER_MAX_RETRIES || 1);
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await call(controller.signal);
    } catch (error) {
      lastError = controller.signal.aborted
        ? new AiProviderTimeoutError(`${operation} timed out.`)
        : error;
      if (attempt >= maxRetries || !isRetryable(lastError)) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}
