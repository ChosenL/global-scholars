export interface PlatformLogContext {
  operation: string;
  correlationId?: string;
  entityType?: string;
  entityId?: string;
}

type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, message: string, context: PlatformLogContext) {
  const entry = {
    level,
    message,
    ...context,
    timestamp: new Date().toISOString(),
  };
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const platformLogger = {
  info: (message: string, context: PlatformLogContext) =>
    write("info", message, context),
  warn: (message: string, context: PlatformLogContext) =>
    write("warn", message, context),
  error: (message: string, context: PlatformLogContext) =>
    write("error", message, context),
};
