import { createHash } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

import { buildAuthorizedContext } from "@/features/ai/context/buildAuthorizedContext";
import { composePrompt } from "@/features/ai/prompts/composePrompt";
import { beginAiInvocation, completeAiInvocation } from "@/features/ai/services/aiAssistant";
import { parseAiAnswer, parseAiRequest } from "@/features/ai/validation";
import {
  AiOperationsDisabledError,
  consumeAiQuota,
  consumeRateLimit,
  createRequestContext,
  executeAiProviderCall,
  operationsLogger,
  rateLimitHeaders,
  reportError,
  responseHeaders,
  subjectRateKey,
} from "@/lib/operations";
import { createClerkSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" } as const;
const answerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "citations", "suggestedActions", "disclaimer"],
  properties: {
    answer: { type: "string" },
    citations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceType", "sourceId", "label"],
        properties: {
          sourceType: { type: "string", enum: ["profile", "document", "task", "note", "application", "visa_case", "timeline", "notification", "readiness"] },
          sourceId: { type: "string" },
          label: { type: "string" },
        },
      },
    },
    suggestedActions: { type: "array", items: { type: "string" }, maxItems: 5 },
    disclaimer: { type: ["string", "null"] },
  },
};

export async function POST(request: Request) {
  const context = createRequestContext(request, "/api/ai");
  const startedAt = Date.now();
  let invocationId: string | undefined;
  let supabase: ReturnType<typeof createClerkSupabaseClient> | undefined;
  const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
    Response.json(body, {
      status,
      headers: responseHeaders(context, { ...noStoreHeaders, ...headers }),
    });

  try {
    const clerkAuth = await auth();
    if (!clerkAuth.userId) return json({ error: "Authentication required." }, 401);
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_SAFETY_SALT) {
      return json({ error: "The CRM AI assistant is not configured." }, 503);
    }

    const input = parseAiRequest(await request.json());
    const model = process.env.OPENAI_CRM_MODEL?.trim() || "gpt-5.6-terra";
    supabase = createClerkSupabaseClient(() => clerkAuth.getToken());

    const rateLimit = await consumeRateLimit(
      "crm_ai",
      subjectRateKey(clerkAuth.userId),
      Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 10),
      60,
    );
    if (!rateLimit.allowed) {
      operationsLogger.warn("request.rate_limited", {
        ...context,
        operation: "crm_ai",
        statusCode: 429,
      });
      return json(
        { error: "AI request limit reached. Please try again shortly." },
        429,
        rateLimitHeaders(rateLimit),
      );
    }

    const quota = await consumeAiQuota(supabase);
    if (!quota.allowed) {
      operationsLogger.warn("ai.access_blocked", {
        ...context,
        reason: quota.reason,
        statusCode: quota.reason === "circuit_open" ? 503 : 429,
      });
      return json(
        {
          error: quota.reason === "circuit_open"
            ? "The AI provider is temporarily unavailable."
            : "Your daily AI usage limit has been reached.",
        },
        quota.reason === "circuit_open" ? 503 : 429,
        { "Retry-After": String(quota.retry_after_seconds) },
      );
    }

    const invocation = await beginAiInvocation(supabase, input, model);
    invocationId = invocation.id;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const moderation = await executeAiProviderCall(
      "crm_ai.input_moderation",
      (signal) => openai.moderations.create({
        model: "omni-moderation-latest",
        input: input.question,
      }, { signal }),
    );
    if (moderation.results.some((result) => result.flagged)) {
      await completeAiInvocation(supabase, invocationId, "refused", {
        latencyMs: Date.now() - startedAt,
        errorCode: "input_moderation",
      });
      return json({ error: "I can’t help with that request." }, 422);
    }

    const authorizedContext = await buildAuthorizedContext(
      supabase,
      input.studentProfileId,
      input.applicationId,
    );
    const allowedCitations = new Set(
      authorizedContext.records.map((record) => `${record.sourceType}:${record.sourceId}`),
    );
    const safetyIdentifier = createHash("sha256")
      .update(`${process.env.OPENAI_SAFETY_SALT}:${clerkAuth.userId}`)
      .digest("hex");
    const response = await executeAiProviderCall(
      "crm_ai.response",
      (signal) => openai.responses.create({
        model,
        reasoning: { effort: "low" },
        instructions: "You are the authorized Global Scholars CRM assistant. Return only the requested structured response.",
        input: composePrompt(input, authorizedContext),
        safety_identifier: safetyIdentifier,
        max_output_tokens: 1200,
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "crm_ai_answer",
            strict: true,
            schema: answerSchema,
          },
        },
      }, { signal }),
    );

    const answer = parseAiAnswer(response.output_text, allowedCitations);
    const outputModeration = await executeAiProviderCall(
      "crm_ai.output_moderation",
      (signal) => openai.moderations.create({
        model: "omni-moderation-latest",
        input: answer.answer,
      }, { signal }),
    );
    if (outputModeration.results.some((result) => result.flagged)) {
      await completeAiInvocation(supabase, invocationId, "refused", {
        latencyMs: Date.now() - startedAt,
        errorCode: "output_moderation",
      });
      return json({ error: "The generated response could not be returned safely." }, 422);
    }

    await completeAiInvocation(supabase, invocationId, "completed", {
      citations: answer.citations,
      usage: {
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
        total_tokens: response.usage?.total_tokens,
      },
      latencyMs: Date.now() - startedAt,
    });
    operationsLogger.info("request.completed", {
      ...context,
      invocationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return json({ invocationId, ...answer });
  } catch (error) {
    if (supabase && invocationId) {
      try {
        await completeAiInvocation(supabase, invocationId, "failed", {
          latencyMs: Date.now() - startedAt,
          errorCode: "gateway_error",
        });
      } catch {
        // Preserve the original provider/gateway failure.
      }
    }
    const message = error instanceof Error ? error.message : "AI request failed.";
    const isInputError = /invalid|unsupported|must contain/i.test(message);
    await reportError({
      error,
      context: { ...context, invocationId },
    });
    return json(
      { error: isInputError ? message : "The CRM AI assistant is temporarily unavailable." },
      isInputError ? 400 : error instanceof AiOperationsDisabledError ? 503 : 502,
    );
  }
}
