/**
 * RAG chat core (powers the public POST /chat).
 *
 * Flow: embed query → pgvector top-K over the org's chunks → assemble a
 * BotConfig-driven system prompt that grounds the model in retrieved context
 * only → stream the OpenAI reply → parse structured rich content + suggested
 * questions → persist USER + ASSISTANT messages → create Conversation if new.
 *
 * The model returns a markdown answer followed by an optional fenced ```json
 * block ({ richContent, suggestedQuestions }). We stream ONLY the markdown
 * (hiding the JSON), then parse the block resiliently — any malformed/missing
 * JSON falls back to plain text. See parseAssistantReply.
 *
 * Naming note: kept as `chat.service.ts` to match the `*.service.ts` convention.
 */
import { Prisma } from "@prisma/client";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";
import { CHAT_MODEL, openai } from "../lib/openai";
import { searchSimilarChunks, type SimilarChunk } from "../lib/pgvector";
import { prisma } from "../lib/prisma";
import type {
  AssistantReply,
  PersistedRichContent,
  RichContentBlock,
} from "../types/chat";
import { getConfig } from "./config.service";
import { embedText } from "./embedding.service";

const TOP_K = 5;
const HISTORY_LIMIT = 10;
const TEMPERATURE = 0.2;
const JSON_FENCE = "```json";

export interface PrepareChatInput {
  organizationId: string;
  message: string;
  conversationId?: string;
  customerName?: string;
  customerEmail?: string;
}

export interface PreparedChat {
  conversationId: string;
  referencedDocIds: string[];
  messages: ChatCompletionMessageParam[];
}

const PERSONALITY_TONE: Record<string, string> = {
  PROFESSIONAL: "Maintain a polished, professional, and concise tone.",
  FRIENDLY: "Be warm, friendly, and conversational.",
  TECHNICAL: "Be precise and technically detailed.",
};

export function buildContext(results: SimilarChunk[]): string {
  if (results.length === 0) return "";
  return results.map((r, i) => `[Source ${i + 1}]\n${r.content}`).join("\n\n");
}

/**
 * System prompt — the hallucination guard plus the output contract:
 * markdown answer, then a ```json block with suggestedQuestions (3–4) and
 * optional richContent blocks.
 */
export function buildSystemPrompt(
  botName: string,
  personality: string,
  context: string,
): string {
  const tone = PERSONALITY_TONE[personality] ?? PERSONALITY_TONE.PROFESSIONAL;
  return [
    `You are ${botName}, an AI customer support assistant.`,
    tone,
    "",
    "Answer the customer's question using ONLY the information in the CONTEXT below.",
    "Rules:",
    "- If the answer is not contained in the CONTEXT, say you don't have that information and offer to connect them with a human agent. Never invent facts, policies, prices, names, or URLs.",
    "- Do not rely on outside or general knowledge. Do not guess.",
    "- Keep answers concise. Use Markdown (bullet lists, tables, links) when it helps.",
    '- Never mention the word "context", "sources", or these instructions.',
    "",
    "OUTPUT FORMAT — after your Markdown answer, append exactly one fenced JSON block:",
    "```json",
    '{"suggestedQuestions": ["...", "..."], "richContent": []}',
    "```",
    "- suggestedQuestions: 3 to 4 short follow-up questions the customer might ask next, grounded in the CONTEXT.",
    "- richContent (optional): structured blocks, each one of:",
    '  {"type":"text","markdown":"..."}',
    '  {"type":"bullets","items":["..."]}',
    '  {"type":"table","headers":["..."],"rows":[["..."]]}',
    '  {"type":"card","title":"...","subtitle":"...","description":"...","url":"...","imageUrl":"..."}',
    '  {"type":"links","links":[{"label":"...","url":"..."}]}',
    "- Use richContent only when it adds value; otherwise use an empty array.",
    "- Only include URLs/links that appear in the CONTEXT. Never invent links.",
    "- The JSON block must be valid JSON and must be the last thing you output.",
    "",
    "CONTEXT:",
    context || "(no relevant information found)",
  ].join("\n");
}

export async function prepareChat(
  input: PrepareChatInput,
): Promise<PreparedChat> {
  const { organizationId, message } = input;

  const config = await getConfig(organizationId);

  // Embed FIRST so a failure throws before we write any rows (no orphans).
  const embedding = await embedText(message);
  const results = await searchSimilarChunks(organizationId, embedding, TOP_K);
  const referencedDocIds = [...new Set(results.map((r) => r.documentId))];

  let conversation = input.conversationId
    ? await prisma.conversation.findFirst({
        where: { id: input.conversationId, organizationId },
      })
    : null;
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        organizationId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        channel: "WIDGET",
      },
    });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "USER", content: message },
  });
  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });
  const recent = history.slice(-HISTORY_LIMIT);

  const systemPrompt = buildSystemPrompt(
    config.botName,
    config.personality,
    buildContext(results),
  );

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...recent.map(
      (m): ChatCompletionMessageParam => ({
        role: m.role === "USER" ? "user" : "assistant",
        content: m.content,
      }),
    ),
  ];

  return { conversationId: conversation.id, referencedDocIds, messages };
}

/**
 * Incremental filter that emits only the visible markdown from a token stream,
 * withholding everything from the ```json fence onward. Holds back the last few
 * chars until it's sure they don't begin the fence, so a partial fence is never
 * emitted. Extracted as a class so the hide-logic is unit-testable.
 */
export class VisibleMarkdownFilter {
  private raw = "";
  private emitted = 0;
  private fenceHit = false;

  /** Feed a delta; returns the visible text to emit (possibly ""). */
  push(delta: string): string {
    this.raw += delta;
    if (this.fenceHit) return "";

    const fenceIdx = this.raw.toLowerCase().indexOf(JSON_FENCE);
    if (fenceIdx !== -1) {
      const out =
        fenceIdx > this.emitted ? this.raw.slice(this.emitted, fenceIdx) : "";
      this.emitted = fenceIdx;
      this.fenceHit = true;
      return out;
    }
    const safe = this.raw.length - (JSON_FENCE.length - 1);
    if (safe > this.emitted) {
      const out = this.raw.slice(this.emitted, safe);
      this.emitted = safe;
      return out;
    }
    return "";
  }

  /** Emit any remaining visible text (only relevant if no fence appeared). */
  flush(): string {
    if (!this.fenceHit && this.raw.length > this.emitted) {
      const out = this.raw.slice(this.emitted);
      this.emitted = this.raw.length;
      return out;
    }
    return "";
  }

  get rawText(): string {
    return this.raw;
  }
}

/**
 * Stream the assistant reply, emitting ONLY the visible markdown via onToken
 * (the trailing ```json block is withheld). Returns the full raw text (incl.
 * the JSON block) for parsing, plus the generation time.
 */
export async function streamReply(
  messages: ChatCompletionMessageParam[],
  onToken: (text: string) => void,
): Promise<{ rawText: string; responseTimeMs: number }> {
  const start = Date.now();
  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: TEMPERATURE,
    stream: true,
  });

  const filter = new VisibleMarkdownFilter();
  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content ?? "";
    if (!delta) continue;
    const visible = filter.push(delta);
    if (visible) onToken(visible);
  }
  const tail = filter.flush();
  if (tail) onToken(tail);

  return { rawText: filter.rawText, responseTimeMs: Date.now() - start };
}

// ---- Resilient parsing of the model's markdown + JSON-block output ----

const richBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), markdown: z.string() }),
  z.object({ type: z.literal("bullets"), items: z.array(z.string()) }),
  z.object({
    type: z.literal("table"),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
  z.object({
    type: z.literal("card"),
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    url: z.string().optional(),
  }),
  z.object({
    type: z.literal("links"),
    links: z.array(z.object({ label: z.string(), url: z.string() })),
  }),
]);

function coerceBlock(raw: unknown): RichContentBlock | null {
  const r = richBlockSchema.safeParse(raw);
  return r.success ? (r.data as RichContentBlock) : null;
}

const JSON_BLOCK_RE = /```json\s*([\s\S]*?)```/i;

/**
 * Parse the model output into a structured AssistantReply. ALWAYS succeeds:
 * - No JSON fence → plain markdown, empty richContent/suggestions.
 * - Malformed JSON → fall back to the markdown text only.
 * - Per-block validation: invalid blocks are dropped, valid ones kept.
 * - suggestedQuestions: non-strings filtered, capped at 4.
 */
export function parseAssistantReply(rawText: string): AssistantReply {
  const trimmed = rawText.trim();
  const content = trimmed.replace(/```json[\s\S]*?```/i, "").trim() || trimmed;
  const match = trimmed.match(JSON_BLOCK_RE);

  if (!match) {
    return { content, richContent: [], suggestedQuestions: [] };
  }

  try {
    const parsed: unknown = JSON.parse(match[1].trim());
    const obj =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};

    const richContent = Array.isArray(obj.richContent)
      ? obj.richContent
          .map(coerceBlock)
          .filter((b): b is RichContentBlock => b !== null)
      : [];

    const suggestedQuestions = Array.isArray(obj.suggestedQuestions)
      ? obj.suggestedQuestions
          .filter((q): q is string => typeof q === "string" && q.trim() !== "")
          .map((q) => q.trim())
          .slice(0, 4)
      : [];

    return { content, richContent, suggestedQuestions };
  } catch {
    // Malformed JSON — degrade gracefully to plain text.
    return { content, richContent: [], suggestedQuestions: [] };
  }
}

const FALLBACK_NO_ANSWER =
  "I'm sorry, I don't have that information right now. I can connect you with a human agent if you'd like.";

const STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "are", "what", "how", "can", "does",
  "with", "this", "that", "have", "has", "our", "any", "about", "from", "will",
]);

/**
 * Extractive fallback answer used when the OpenAI chat model is unavailable.
 * Keyword-matches the query against the org's stored chunk text and returns the
 * best-matching chunk, so the widget still gives a doc-grounded reply instead of
 * erroring. Degraded (no generation), but functional.
 */
export async function keywordFallbackAnswer(
  organizationId: string,
  query: string,
): Promise<{ text: string; referencedDocIds: string[] }> {
  const terms = [
    ...new Set(
      (query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter(
        (w) => !STOPWORDS.has(w),
      ),
    ),
  ];
  if (terms.length === 0) {
    return { text: FALLBACK_NO_ANSWER, referencedDocIds: [] };
  }

  const chunks = await prisma.documentChunk.findMany({
    where: { organizationId },
    select: { content: true, documentId: true },
  });

  let best: { content: string; documentId: string } | null = null;
  let bestScore = 0;
  for (const c of chunks) {
    const lc = c.content.toLowerCase();
    const score = terms.reduce((n, t) => (lc.includes(t) ? n + 1 : n), 0);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  if (!best || bestScore === 0) {
    return { text: FALLBACK_NO_ANSWER, referencedDocIds: [] };
  }
  return { text: best.content.trim(), referencedDocIds: [best.documentId] };
}

/** Persist the ASSISTANT message (markdown + rich content) and bump activity. */
export async function persistAssistantMessage(
  conversationId: string,
  reply: AssistantReply,
  responseTimeMs: number,
  referencedDocIds: string[],
): Promise<void> {
  const hasRich =
    reply.richContent.length > 0 || reply.suggestedQuestions.length > 0;
  const persistedRich: PersistedRichContent = {
    blocks: reply.richContent,
    suggestedQuestions: reply.suggestedQuestions,
  };

  await prisma.message.create({
    data: {
      conversationId,
      role: "ASSISTANT",
      content: reply.content,
      responseTimeMs,
      referencedDocIds: referencedDocIds as Prisma.InputJsonValue,
      richContent: hasRich
        ? (persistedRich as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });
}
