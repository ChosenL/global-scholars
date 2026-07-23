"use client";

import {
  Bot,
  CalendarDays,
  Mail,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const calendlyLink =
  "https://calendly.com/thompsondwayne0055/free-10_minute-consultation";

const welcomeMessage: Message = {
  role: "assistant",
  content:
    "Hello! I’m the Global Scholars AI Advisor. I can answer general questions about university admissions, college transfers, credential evaluations, career readiness, CPT and OPT education, and our services. How may I help you today?",
};

const starterQuestions = [
  "What services do you offer?",
  "Can you help me transfer universities?",
  "What is a credential evaluation?",
  "How do I book the free consultation?",
];

export default function GlobalScholarsAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";

    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 250);
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  async function sendMessage(question: string) {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isLoading) {
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: trimmedQuestion,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      const data: {
        message?: string;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "The AI Advisor could not respond."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            data.message ||
            "Please contact info@globalscholarspathway.com for assistance.",
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "The AI Advisor is temporarily unavailable.";

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `${errorMessage} You may also email info@globalscholarspathway.com.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function resetConversation() {
    setMessages([welcomeMessage]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[80] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full bg-[#C8A24A] px-4 py-4 font-black text-[#071526] shadow-2xl transition duration-300 hover:scale-105 sm:px-5 ${
          isOpen
            ? "pointer-events-none translate-y-5 opacity-0"
            : "translate-y-0 opacity-100"
        }`}
        aria-label="Open Global Scholars AI Advisor"
      >
        <MessageCircle size={24} />
        <span className="hidden sm:inline">Ask Global Scholars</span>
      </button>

      <div
        className={`fixed inset-0 z-[120] overflow-hidden bg-[#071526]/65 p-3 backdrop-blur-sm transition duration-300 sm:flex sm:items-end sm:justify-end sm:p-6 ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsOpen(false)}
      >
        <section
          className={`flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl transition duration-300 sm:h-[720px] sm:max-h-[calc(100vh-3rem)] sm:w-[420px] ${
            isOpen
              ? "translate-y-0 scale-100"
              : "translate-y-8 scale-95"
          }`}
          onClick={(event) => event.stopPropagation()}
          aria-label="Global Scholars AI Advisor"
        >
          <header className="bg-[#071526] px-5 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C8A24A] text-[#071526]">
                  <Bot size={26} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black">
                      Global Scholars AI Advisor
                    </h2>

                    <Sparkles
                      size={15}
                      className="text-[#C8A24A]"
                    />
                  </div>

                  <p className="mt-1 text-xs text-white/70">
                    Online virtual education assistant
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
                aria-label="Close AI Advisor"
              >
                <X size={22} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-[#F8F9FB] px-4 py-5">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "rounded-br-md bg-[#0F2747] text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {messages.length === 1 && (
                <div className="grid gap-2">
                  {starterQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void sendMessage(question)}
                      className="rounded-xl border border-[#C8A24A]/40 bg-white px-4 py-3 text-left text-sm font-bold text-[#0F2747] transition hover:border-[#C8A24A] hover:bg-[#C8A24A]/10"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-[#C8A24A]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-[#C8A24A] [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-[#C8A24A] [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-4">
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                placeholder="Ask a question..."
                className="max-h-28 min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-slate-300 px-3 py-3 text-base text-[#071526] outline-none transition focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20 sm:px-4 sm:text-sm"
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F2747] text-white transition hover:bg-[#173A68] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={resetConversation}
                className="inline-flex items-center gap-1 font-semibold text-slate-500 transition hover:text-[#0F2747]"
              >
                <RotateCcw size={14} />
                Start over
              </button>

              <div className="flex items-center gap-4">
                <a
                  href="mailto:info@globalscholarspathway.com"
                  className="inline-flex items-center gap-1 font-semibold text-[#0F2747]"
                >
                  <Mail size={14} />
                  Email
                </a>

                <a
                  href={calendlyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#0F2747]"
                >
                  <CalendarDays size={14} />
                  Book
                </a>
              </div>
            </div>

            <p className="mt-3 text-center text-[10px] leading-4 text-slate-400">
              AI responses provide general information and may contain errors.
              Confirm important decisions with a qualified advisor.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
