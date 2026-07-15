import OpenAI from "openai";
import { NextResponse } from "next/server";

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
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "The Global Scholars AI Advisor has not been configured correctly.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const rawMessages = body?.messages;

    if (!Array.isArray(rawMessages)) {
      return NextResponse.json(
        { error: "Please enter a question." },
        { status: 400 }
      );
    }

    const messages = rawMessages
      .filter(isValidMessage)
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.content.trim().slice(0, 2000),
      }));

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Please enter a question." },
        { status: 400 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      reasoning: {
        effort: "low",
      },
      instructions: advisorInstructions,
      input: messages,
      max_output_tokens: 500,
    });

    const answer = response.output_text?.trim();

    if (!answer) {
      return NextResponse.json(
        {
          error:
            "I could not prepare an answer. Please contact info@globalscholarspathway.com.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: answer,
    });
  } catch (error) {
    console.error("Global Scholars AI Advisor error:", error);

    return NextResponse.json(
      {
        error:
          "The Global Scholars AI Advisor is temporarily unavailable. Please try again shortly.",
      },
      { status: 500 }
    );
  }
}