/**
 * Chat rich-content types — mirror of `backend/src/types/chat.ts`.
 * Keep in sync with the backend (no shared package in this monorepo).
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
  content: string;
  richContent: RichContentBlock[];
  suggestedQuestions: string[];
}

/** Shape stored in Message.richContent. */
export interface PersistedRichContent {
  blocks: RichContentBlock[];
  suggestedQuestions: string[];
}

/** SSE events streamed by POST /chat. */
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
