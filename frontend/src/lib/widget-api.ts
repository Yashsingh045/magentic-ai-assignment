import type { ChatStreamEvent, RichContentBlock } from "./chat-types";

const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface WidgetConfig {
  botName: string;
  welcomeMessage: string;
  personality: "PROFESSIONAL" | "FRIENDLY" | "TECHNICAL";
}

/** Fetch the public bot config (welcome message, name) for the widget. */
export async function getWidgetConfig(
  apiKey: string,
  apiBase: string = DEFAULT_API_BASE,
): Promise<WidgetConfig> {
  const res = await fetch(`${apiBase}/api/chat/config`, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) throw new Error(`config ${res.status}`);
  return res.json();
}

export interface StreamChatHandlers {
  onMeta?: (conversationId: string, referencedDocIds: string[]) => void;
  onToken: (text: string) => void;
  onDone: (event: {
    content: string;
    richContent: RichContentBlock[];
    suggestedQuestions: string[];
    responseTimeMs: number;
  }) => void;
  onError: (message: string) => void;
}

/**
 * POST /chat and consume the SSE stream over fetch.
 *
 * The backend streams `data: <json>\n\n` events (meta/token/done/error). If
 * prep fails the response is a non-stream JSON error (handled via !res.ok).
 */
export async function streamChat(
  opts: {
    apiKey: string;
    apiBase?: string;
    message: string;
    conversationId?: string;
  },
  handlers: StreamChatHandlers,
): Promise<void> {
  const apiBase = opts.apiBase ?? DEFAULT_API_BASE;
  let res: Response;
  try {
    res = await fetch(`${apiBase}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": opts.apiKey },
      body: JSON.stringify({
        message: opts.message,
        conversationId: opts.conversationId,
      }),
    });
  } catch {
    handlers.onError("Can't reach the assistant. Check your connection.");
    return;
  }

  if (!res.ok || !res.body) {
    let message = "The assistant is unavailable right now.";
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON body */
    }
    handlers.onError(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      if (!json) continue;

      let event: ChatStreamEvent;
      try {
        event = JSON.parse(json) as ChatStreamEvent;
      } catch {
        continue; // ignore malformed frame
      }

      switch (event.type) {
        case "meta":
          handlers.onMeta?.(event.conversationId, event.referencedDocIds);
          break;
        case "token":
          handlers.onToken(event.text);
          break;
        case "done":
          handlers.onDone({
            content: event.content,
            richContent: event.richContent,
            suggestedQuestions: event.suggestedQuestions,
            responseTimeMs: event.responseTimeMs,
          });
          break;
        case "error":
          handlers.onError(event.error);
          break;
      }
    }
  }
}
