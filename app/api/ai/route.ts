import { createHash } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

import { buildAuthorizedContext } from "@/features/ai/context/buildAuthorizedContext";
import { composePrompt } from "@/features/ai/prompts/composePrompt";
import { beginAiInvocation, completeAiInvocation } from "@/features/ai/services/aiAssistant";
import { parseAiAnswer, parseAiRequest } from "@/features/ai/validation";
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
  const startedAt = Date.now();
  let invocationId: string | undefined;
  let supabase: ReturnType<typeof createClerkSupabaseClient> | undefined;
  try {
    const clerkAuth = await auth();
    if (!clerkAuth.userId) {
      return Response.json({ error: "Authentication required." }, { status: 401, headers: noStoreHeaders });
    }
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "The CRM AI assistant is not configured." }, { status: 503, headers: noStoreHeaders });
    }

    const input = parseAiRequest(await request.json());
    const model = process.env.OPENAI_CRM_MODEL?.trim() || "gpt-5.6-terra";
    supabase = createClerkSupabaseClient(() => clerkAuth.getToken());
    const invocation = await beginAiInvocation(supabase, input, model);
    invocationId = invocation.id;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: input.question,
    });
    if (moderation.results.some((result) => result.flagged)) {
      await completeAiInvocation(supabase, invocationId, "refused", {
        latencyMs: Date.now() - startedAt,
        errorCode: "input_moderation",
      });
      return Response.json({ error: "I can’t help with that request." }, { status: 422, headers: noStoreHeaders });
    }

    const context = await buildAuthorizedContext(supabase, input.studentProfileId, input.applicationId);
    const allowedCitations = new Set(context.records.map((record) => `${record.sourceType}:${record.sourceId}`));
    const safetyIdentifier = createHash("sha256")
      .update(`${process.env.OPENAI_SAFETY_SALT || "global-scholars"}:${clerkAuth.userId}`)
      .digest("hex");
    const response = await openai.responses.create({
      model,
      reasoning: { effort: "low" },
      instructions: "You are the authorized Global Scholars CRM assistant. Return only the requested structured response.",
      input: composePrompt(input, context),
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
    });
    const answer = parseAiAnswer(response.output_text, allowedCitations);
    const outputModeration = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: answer.answer,
    });
    if (outputModeration.results.some((result) => result.flagged)) {
      await completeAiInvocation(supabase, invocationId, "refused", {
        latencyMs: Date.now() - startedAt,
        errorCode: "output_moderation",
      });
      return Response.json({ error: "The generated response could not be returned safely." }, { status: 422, headers: noStoreHeaders });
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
    return Response.json({ invocationId, ...answer }, { headers: noStoreHeaders });
  } catch (error) {
    if (supabase && invocationId) {
      try {
        await completeAiInvocation(supabase, invocationId, "failed", {
          latencyMs: Date.now() - startedAt,
          errorCode: "gateway_error",
        });
      } catch {
        // The original error remains authoritative.
      }
    }
    const message = error instanceof Error ? error.message : "AI request failed.";
    const isInputError = /invalid|unsupported|must contain/i.test(message);
    console.error("CRM AI gateway error", { invocationId, error: message });
    return Response.json(
      { error: isInputError ? message : "The CRM AI assistant is temporarily unavailable." },
      { status: isInputError ? 400 : 500, headers: noStoreHeaders },
    );
  }
}
