import { Request, Response } from "express";
import { getTenantId } from "../middleware/tenant";
import { getPublicConfig } from "../services/config.service";
import { escalateConversation } from "../services/escalation.service";
import {
  parseAssistantReply,
  persistAssistantMessage,
  prepareChat,
  streamReply,
} from "../services/chat.service";

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
    const { rawText, responseTimeMs } = await streamReply(
      prepared.messages,
      (token) => send({ type: "token", text: token }),
    );
    // Parse markdown + optional JSON block into structured rich content.
    const reply = parseAssistantReply(rawText);
    await persistAssistantMessage(
      prepared.conversationId,
      reply,
      responseTimeMs,
      prepared.referencedDocIds,
    );
    send({
      type: "done",
      conversationId: prepared.conversationId,
      referencedDocIds: prepared.referencedDocIds,
      responseTimeMs,
      content: reply.content,
      richContent: reply.richContent,
      suggestedQuestions: reply.suggestedQuestions,
    });

    // Fire-and-forget escalation check on the customer's message — runs its own
    // rule+LLM detection and creates a Ticket + EscalationEvent if warranted.
    // Not awaited: it must not add latency to the chat response.
    void escalateConversation({
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
