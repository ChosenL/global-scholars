import { redactForLogging } from "./redaction";

export type LogLevel = "info" | "warn" | "error";
export interface LogContext {
  requestId?: string;
  correlationId?: string;
  route?: string;
  operation?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const entry = redactForLogging({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const operationsLogger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
