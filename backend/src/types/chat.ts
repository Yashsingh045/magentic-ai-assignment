/**
 * Shared chat rich-content types.
 *
 * The assistant reply is markdown (`content`) plus optional structured
 * `richContent` blocks and 3–4 `suggestedQuestions`. These types are mirrored
 * on the frontend in `frontend/src/lib/chat-types.ts` — keep them in sync.
 */

export type RichContentBlock =
  | { type: "text"; markdown: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | {
      type: "card";
      title: string;
      subtitle?: string;
      description?: string;
      imageUrl?: string;
      url?: string;
    }
  | { type: "links"; links: { label: string; url: string }[] };

export interface AssistantReply {
  /** Human-readable markdown answer (also persisted as Message.content). */
  content: string;
  /** Optional structured blocks for richer rendering. */
  richContent: RichContentBlock[];
  /** 3–4 contextual follow-up questions. */
  suggestedQuestions: string[];
}

/** Shape persisted in Message.richContent (JSON column). */
export interface PersistedRichContent {
  blocks: RichContentBlock[];
  suggestedQuestions: string[];
}

/** SSE event union streamed by POST /chat (each line: `data: <json>\n\n`). */
export type ChatStreamEvent =
  | { type: "meta"; conversationId: string; referencedDocIds: string[] }
  | { type: "token"; text: string }
  | {
      type: "done";
      conversationId: string;
      referencedDocIds: string[];
      responseTimeMs: number;
      content: string;
      richContent: RichContentBlock[];
      suggestedQuestions: string[];
    }
  | { type: "error"; error: string };
