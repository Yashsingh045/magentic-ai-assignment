"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import type { RichContentBlock } from "@/lib/chat-types";
import {
  getWidgetConfig,
  streamChat,
  type WidgetConfig,
} from "@/lib/widget-api";
import { Markdown, RichContent } from "./RichContent";

interface WidgetMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  richContent?: RichContentBlock[];
  streaming?: boolean;
  failed?: boolean;
}

const DEFAULT_STARTERS = [
  "What are your business hours?",
  "How do I contact support?",
  "What is your refund policy?",
];

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return (p.map((x) => x[0]).slice(0, 2).join("") || "AI").toUpperCase();
}

export function ChatWidget({
  apiKey,
  apiBase,
}: {
  apiKey: string;
  apiBase?: string;
}) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_STARTERS);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load bot config (welcome message + name).
  useEffect(() => {
    getWidgetConfig(apiKey, apiBase)
      .then(setConfig)
      .catch(() =>
        setConfig({
          botName: "Support",
          welcomeMessage: "Hi! How can I help you today?",
          personality: "PROFESSIONAL",
        }),
      );
  }, [apiKey, apiBase]);

  // Seed the welcome message once config arrives.
  useEffect(() => {
    if (config && messages.length === 0) {
      setMessages([
        { id: "welcome", role: "assistant", content: config.welcomeMessage },
      ]);
    }
  }, [config, messages.length]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || sending) return;

      setError(null);
      setSuggestions([]);
      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", content: message },
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);
      setInput("");
      setSending(true);

      await streamChat(
        {
          apiKey,
          apiBase,
          message,
          conversationId: conversationId ?? undefined,
        },
        {
          onMeta: (convId) => setConversationId(convId),
          onToken: (t) =>
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + t, streaming: true }
                  : m,
              ),
            ),
          onDone: (e) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: e.content || m.content,
                      richContent: e.richContent,
                      streaming: false,
                    }
                  : m,
              ),
            );
            setSuggestions(e.suggestedQuestions ?? []);
          },
          onError: (msg) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content:
                        m.content ||
                        "Sorry, something went wrong. Please try again.",
                      streaming: false,
                      failed: true,
                    }
                  : m,
              ),
            );
            setError(msg);
          },
        },
      );
      setSending(false);
    },
    [apiKey, apiBase, conversationId, sending],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  const botName = config?.botName ?? "Support";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Chat window */}
      {open && (
        <div
          className="animate-widget-in mb-3 flex h-[70vh] max-h-[600px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          role="dialog"
          aria-label="Chat widget"
        >
          {/* Header */}
          <div className="flex items-center gap-3 bg-indigo-600 px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
              {initials(botName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{botName}</p>
              <p className="flex items-center gap-1.5 text-xs text-indigo-100">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Online
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Minimize chat"
              className="rounded-md p-1.5 text-indigo-100 transition hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4"
          >
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} botInitials={initials(botName)} />
            ))}
            {error && (
              <p className="text-center text-xs text-red-500">{error}</p>
            )}
          </div>

          {/* Suggestion chips */}
          {suggestions.length > 0 && !sending && (
            <div className="flex flex-wrap gap-2 border-t border-gray-100 bg-white px-3 py-2">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your message…"
              disabled={sending}
              className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M3 11l18-8-8 18-2-7-8-3z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:scale-105 hover:bg-indigo-500 active:scale-95"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 20l1-3.1A8.4 8.4 0 1 1 21 11.5z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function MessageBubble({
  message,
  botInitials,
}: {
  message: WidgetMessage;
  botInitials: string;
}) {
  const isUser = message.role === "user";
  const isTyping = message.streaming && message.content === "";

  return (
    <div
      className={cn(
        "animate-msg-in flex items-end gap-2",
        isUser && "flex-row-reverse",
      )}
    >
      {!isUser && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
          {botInitials}
        </span>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          isUser
            ? "rounded-br-sm bg-indigo-600 text-white"
            : "rounded-bl-sm border border-gray-200 bg-white text-gray-800",
          message.failed && "border-red-200 bg-red-50 text-red-700",
        )}
      >
        {isTyping ? (
          <TypingIndicator />
        ) : isUser ? (
          message.content
        ) : (
          <>
            <Markdown>{message.content}</Markdown>
            <RichContent blocks={message.richContent} />
          </>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
