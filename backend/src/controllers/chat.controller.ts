import { Request, Response } from "express";
import { getTenantId } from "../middleware/tenant";
import { getPublicConfig } from "../services/config.service";
import { escalateConversation } from "../services/escalation.service";
import {
  keywordFallbackAnswer,
  parseAssistantReply,
  persistAssistantMessage,
  prepareChat,
  streamReply,
} from "../services/chat.service";
import type { AssistantReply } from "../types/chat";

/** Public bot config for the widget (authed by publicApiKey via tenantFromApiKey). */
export async function widgetConfig(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  res.json(await getPublicConfig(organizationId));
}

/**
 * Public streaming chat endpoint (SSE).
 *
 * Prep (embed/retrieve/persist USER) runs BEFORE we commit to a stream, so any
 * failure there surfaces as a normal HTTP error via the error handler. Once we
 * start streaming we've sent 200 + SSE headers, so errors after that point are
 * delivered as a `{ type: "error" }` SSE event instead.
 *
 * Event shapes (each line: `data: <json>\n\n`):
 *   { type: "meta",  conversationId, referencedDocIds }
 *   { type: "token", text }                       // visible markdown only
 *   { type: "done",  conversationId, referencedDocIds, responseTimeMs,
 *                    content, richContent, suggestedQuestions }
 *   { type: "error", error }
 */
export async function chat(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req); // set by tenantFromApiKey
  const { message, conversationId, customerName, customerEmail } = req.body;

  const prepared = await prepareChat({
    organizationId,
    message,
    conversationId,
    customerName,
    customerEmail,
  });

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable proxy buffering

  const send = (payload: unknown) =>
    res.write(`data: ${JSON.stringify(payload)}\n\n`);

  send({
    type: "meta",
    conversationId: prepared.conversationId,
    referencedDocIds: prepared.referencedDocIds,
  });

  try {
    let reply: AssistantReply;
    let responseTimeMs: number;
    let referencedDocIds = prepared.referencedDocIds;

    try {
      // Primary path: stream the OpenAI reply.
      const r = await streamReply(prepared.messages, (token) =>
        send({ type: "token", text: token }),
      );
      responseTimeMs = r.responseTimeMs;
      reply = parseAssistantReply(r.rawText);
    } catch (llmErr) {
      // OpenAI chat unavailable (e.g. no quota) → extractive keyword fallback
      // from the org's documents, so the widget still answers instead of erroring.
      console.warn(
        "chat: LLM unavailable, using extractive fallback —",
        (llmErr as { code?: string })?.code ?? "",
      );
      const fb = await keywordFallbackAnswer(organizationId, message);
      send({ type: "token", text: fb.text });
      reply = { content: fb.text, richContent: [], suggestedQuestions: [] };
      responseTimeMs = 0;
      referencedDocIds = fb.referencedDocIds;
    }

    await persistAssistantMessage(
      prepared.conversationId,
      reply,
      responseTimeMs,
      referencedDocIds,
    );
    send({
      type: "done",
      conversationId: prepared.conversationId,
      referencedDocIds,
      responseTimeMs,
      content: reply.content,
      richContent: reply.richContent,
      suggestedQuestions: reply.suggestedQuestions,
    });

    // Escalation check on the customer's message — runs rule+LLM detection and
    // creates a Ticket + EscalationEvent if warranted. Awaited AFTER the `done`
    // event (so it adds no perceived latency — the answer is already streamed),
    // which keeps it reliable on serverless platforms (e.g. Vercel) that freeze
    // the function once the response ends.
    await escalateConversation({
      organizationId,
      conversationId: prepared.conversationId,
      message,
      customerName,
      customerEmail,
    }).catch((err) => console.error("escalation error:", err));
  } catch (err) {
    console.error("chat stream error:", err);
    send({
      type: "error",
      error: "The assistant is unavailable right now. Please try again.",
    });
  } finally {
    res.end();
  }
}
