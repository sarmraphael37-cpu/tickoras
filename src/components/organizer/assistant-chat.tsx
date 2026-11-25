"use client";

import { useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { askAssistant } from "@/app/actions/assistant";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  engine?: "ai" | "analytics";
}

const SUGGESTED = [
  "Will I sell out before my next event?",
  "What's my revenue this month?",
  "Give me recommendations",
  "Which marketing channel performs best?",
  "How's my profit looking?",
];

function renderText(text: string) {
  // Minimal markdown: **bold** and newlines.
  return text.split("\n").map((line, i) => (
    <p key={i} className={i > 0 ? "mt-1.5" : ""}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={j}>{part}</span>
        ),
      )}
    </p>
  ));
}

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);
    try {
      const res = await askAssistant(message);
      if ("error" in res) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${res.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: res.reply.answer,
            engine: res.engine,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong reaching the assistant. Try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-ink">TICKORA Analyst</p>
          <p className="text-[10.5px] text-muted">
            Answers from your real bookings, revenue, expenses & marketing data
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles className="h-8 w-8 text-accent-300" />
            <p className="mt-3 text-[13px] font-medium text-ink">
              Ask about your event business
            </p>
            <p className="mt-1 max-w-xs text-[11.5px] text-muted">
              Sales forecasts, revenue, profit, expenses, marketing ROI and
              recommendations — computed from your actual records.
            </p>
            <div className="mt-4 flex max-w-md flex-wrap justify-center gap-1.5">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-[10.5px] text-muted transition hover:border-brand-300 hover:text-ink"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-[12.5px] leading-5",
                  msg.role === "user"
                    ? "bg-brand-600 text-white"
                    : "border border-line bg-surface text-muted",
                )}
              >
                {renderText(msg.content)}
                {msg.engine === "analytics" ? (
                  <p className="mt-1.5 text-[9px] uppercase tracking-[0.1em] text-faint">
                    Analytics engine
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
        {loading ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2.5 text-[12px] text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing your data…
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex gap-2 border-t border-line bg-surface p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about sales, revenue, profit, marketing…"
          maxLength={500}
          className="h-10 flex-1 rounded-lg border border-line bg-card px-3 text-[12.5px] text-ink placeholder:text-faint focus:border-brand-400 focus:outline-none"
        />
        <Button type="submit" size="sm" loading={loading} disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
