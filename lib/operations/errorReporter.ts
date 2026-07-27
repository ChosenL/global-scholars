import { operationsLogger, type LogContext } from "./logger";
import { redactForLogging } from "./redaction";

export interface ErrorReport {
  error: unknown;
  context: LogContext;
  severity?: "warning" | "error" | "fatal";
}

export interface ErrorReporter {
  capture(report: ErrorReport): Promise<void>;
}

class LoggingErrorReporter implements ErrorReporter {
  async capture(report: ErrorReport) {
    operationsLogger.error("operation.error", {
      ...report.context,
      severity: report.severity ?? "error",
      error: redactForLogging(report.error),
    });
  }
}

let reporter: ErrorReporter = new LoggingErrorReporter();

export function registerErrorReporter(nextReporter: ErrorReporter) {
  reporter = nextReporter;
}

export async function reportError(report: ErrorReport) {
  try {
    await reporter.capture(report);
  } catch (reportingError) {
    operationsLogger.error("error_reporter.failure", {
      ...report.context,
      error: redactForLogging(reportingError),
    });
  }
}
