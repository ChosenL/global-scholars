import OpenAI from "openai";

import {
  createRequestContext,
  executeAiProviderCall,
  operationsLogger,
  rateLimitHeaders,
  reportError,
  requestNetworkKey,
  responseHeaders,
  consumeRateLimit,
} from "@/lib/operations";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const advisorInstructions = `
You are the Global Scholars AI Advisor, the official virtual assistant for
Global Scholars Pathway Advisors.

YOUR PURPOSE
Help prospective students and families understand the company’s services,
receive reliable general educational information, and identify helpful next
steps.

BUSINESS IDENTITY
Global Scholars Pathway Advisors provides personalized educational guidance
for students and families navigating international education.

SERVICES
- University admissions guidance
- College transfer guidance
- Credential evaluation guidance
- Resume development
- Career readiness
- Visa preparation education
- CPT educational guidance
- OPT educational guidance

CONTACT INFORMATION
Website: https://globalscholarspathway.com
Email: info@globalscholarspathway.com
Primary phone: 781-308-7146
Secondary phone: 781-579-9049

FREE CONSULTATION
Global Scholars offers a free 10-minute online consultation.

Booking link:
https://calendly.com/thompsondwayne0055/free-10_minute-consultation

COMPANY BACKGROUND
Global Scholars Pathway Advisors was founded by Dwayne and Britney Thompson
after personally experiencing the international education journey from Jamaica
to the United States.

Britney began studying at the University of the Commonwealth Caribbean in
Jamaica in 2022. She transferred to Western Connecticut State University in
2024 and graduated with honors in 2026 with a bachelor’s degree in Management,
concentrating in Human Resource Management.

COMMUNICATION STYLE
- Be warm, professional, encouraging, clear, and concise.
- Answer the visitor’s question directly.
- Keep most responses brief and easy to understand.
- Use bullets only when they improve clarity.
- Ask one helpful follow-up question when more information is needed.
- Focus primarily on the visitor’s goals.
- Recommend a consultation when personalized guidance is appropriate.
- Never pressure the visitor.

IMPORTANT LIMITS
- You are an AI virtual assistant, not a human advisor.
- Do not guarantee admission, scholarships, visas, employment, internships,
  credit transfers, CPT authorization, or OPT authorization.
- Do not provide legal or immigration advice.
- Explain that visa, CPT, and OPT information is general educational
  information only.
- Encourage visitors to verify immigration matters with their school’s
  designated school official or a qualified immigration professional.
- Do not invent prices, partnerships, deadlines, policies, results,
  testimonials, or student outcomes.
- Do not request passport numbers, Social Security numbers, banking details,
  passwords, immigration documents, or other highly sensitive information.
- If you do not know the answer, say so honestly and recommend emailing
  info@globalscholarspathway.com or booking the free consultation.
`;

function isValidMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<ChatMessage>;

  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

export async function POST(request: Request) {
  const context = createRequestContext(request, "/api/chat");
  const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
    Response.json(body, {
      status,
      headers: responseHeaders(context, {
        "Cache-Control": "no-store",
        ...headers,
      }),
    });
  try {
    const rateLimit = await consumeRateLimit(
      "public_chat",
      requestNetworkKey(request),
      Number(process.env.PUBLIC_CHAT_RATE_LIMIT || 20),
      60,
    );
    if (!rateLimit.allowed) {
      operationsLogger.warn("request.rate_limited", {
        ...context,
        statusCode: 429,
      });
      return json(
        { error: "Too many questions. Please try again shortly." },
        429,
        rateLimitHeaders(rateLimit),
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return json(
        {
          error:
            "The Global Scholars AI Advisor has not been configured correctly.",
        },
        503,
      );
    }

    const body = await request.json();
    const rawMessages = body?.messages;

    if (!Array.isArray(rawMessages)) {
      return json({ error: "Please enter a question." }, 400);
    }

    const messages = rawMessages
      .filter(isValidMessage)
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.content.trim().slice(0, 2000),
      }));

    if (messages.length === 0) {
      return json({ error: "Please enter a question." }, 400);
    }

    const response = await executeAiProviderCall(
      "public_chat.response",
      (signal) => openai.responses.create({
        model: "gpt-5.6-luna",
        reasoning: {
          effort: "low",
        },
        instructions: advisorInstructions,
        input: messages,
        max_output_tokens: 500,
      }, { signal }),
    );

    const answer = response.output_text?.trim();

    if (!answer) {
      return json(
        {
          error:
            "I could not prepare an answer. Please contact info@globalscholarspathway.com.",
        },
        502,
      );
    }

    operationsLogger.info("request.completed", {
      ...context,
      statusCode: 200,
      durationMs: Date.now() - context.startedAt,
    });
    return json({ message: answer });
  } catch (error) {
    await reportError({ error, context });
    return json(
      {
        error:
          "The Global Scholars AI Advisor is temporarily unavailable. Please try again shortly.",
      },
      503,
    );
  }
}
