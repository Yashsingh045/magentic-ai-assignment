/**
 * Escalation detection + handling for the chat flow.
 *
 * Two signals are combined:
 *  1. RULE layer (deterministic, cheap): keyword match against built-in category
 *     keywords + the org's custom keywords. High recall, but noisy on its own
 *     (e.g. "I do NOT want a refund" contains "refund").
 *  2. LLM layer (contextual): a JSON-mode classification that understands
 *     negation/intent and assigns a category + priority + confidence.
 *
 * Combination (see detectEscalation): the org's BotConfig toggles GATE which
 * categories may escalate; the LLM CONFIRMS genuine intent (precision); the rule
 * layer CORROBORATES (priority boost) and serves as a deterministic FALLBACK if
 * the LLM is unavailable. This keeps false positives low while staying robust.
 */
import { Priority } from "@prisma/client";
import { z } from "zod";
import { CHAT_MODEL, openai } from "../lib/openai";
import { prisma } from "../lib/prisma";
import type { EscalationRules } from "../schemas/config.schema";
import { getConfig } from "./config.service";
import { createTicket } from "./ticket.service";

export type EscalationCategory =
  | "refund"
  | "payment_failure"
  | "outage"
  | "legal"
  | "angry"
  | "human_requested"
  | "custom";

export interface EscalationDecision {
  escalate: boolean;
  category: EscalationCategory | null;
  priority: Priority;
  reason: string;
  /** Which layers fired — surfaced for transparency/debugging. */
  signals: { rule: boolean; llm: boolean };
}

const PRIORITY_ORDER: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
function bumpUp(p: Priority): Priority {
  const i = PRIORITY_ORDER.indexOf(p);
  return PRIORITY_ORDER[Math.min(i + 1, PRIORITY_ORDER.length - 1)];
}
function higherOf(a: Priority, b: Priority): Priority {
  return PRIORITY_ORDER.indexOf(a) >= PRIORITY_ORDER.indexOf(b) ? a : b;
}

/** Default priority per category (used when the LLM doesn't give one). */
const CATEGORY_PRIORITY: Record<EscalationCategory, Priority> = {
  outage: "URGENT",
  payment_failure: "URGENT",
  legal: "HIGH",
  angry: "HIGH",
  refund: "MEDIUM",
  human_requested: "MEDIUM",
  custom: "MEDIUM",
};

const CATEGORY_KEYWORDS: Record<
  Exclude<EscalationCategory, "custom">,
  string[]
> = {
  refund: ["refund", "money back", "reimburse", "chargeback"],
  payment_failure: [
    "payment failed",
    "payment declined",
    "card declined",
    "charged twice",
    "double charged",
    "overcharged",
    "can't pay",
    "cannot pay",
    "billing error",
  ],
  outage: [
    "outage",
    "is down",
    "website down",
    "service down",
    "not working",
    "can't access",
    "cannot access",
    "everything is broken",
  ],
  legal: ["lawsuit", "lawyer", "attorney", "legal action", "gdpr", "data breach", "court", "sue you"],
  angry: ["terrible", "worst", "furious", "unacceptable", "ridiculous", "scam", "fraud", "hate this"],
  human_requested: [
    "speak to a human",
    "talk to a person",
    "real person",
    "human agent",
    "live agent",
    "representative",
    "speak to someone",
    "talk to an agent",
  ],
};

/** Is a category eligible to escalate for this org? Toggles gate the 4 configurable
 *  categories; payment-failure/outage are always operationally critical; custom
 *  keywords are an explicit org-chosen trigger. */
function categoryEnabled(cat: EscalationCategory, rules: EscalationRules): boolean {
  switch (cat) {
    case "refund":
      return rules.refundRequested;
    case "legal":
      return rules.legalComplaint;
    case "angry":
      return rules.customerAngry;
    case "human_requested":
      return rules.humanRequested;
    case "payment_failure":
    case "outage":
    case "custom":
      return true;
  }
}

/** Deterministic keyword detection. Returns the categories that matched. */
function ruleDetect(message: string, rules: EscalationRules): EscalationCategory[] {
  const text = message.toLowerCase();
  const hits: EscalationCategory[] = [];
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((kw) => text.includes(kw))) hits.push(cat as EscalationCategory);
  }
  if (rules.customKeywords.some((kw) => text.includes(kw.toLowerCase()))) {
    hits.push("custom");
  }
  return hits;
}

const llmResultSchema = z.object({
  escalate: z.boolean(),
  category: z.enum([
    "refund",
    "payment_failure",
    "outage",
    "legal",
    "angry",
    "human_requested",
    "none",
  ]),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]),
  reason: z.string().max(240).optional().default(""),
  confidence: z.number().min(0).max(1).optional().default(0.5),
});
type LLMResult = z.infer<typeof llmResultSchema>;

const CLASSIFY_PROMPT = `You triage customer support messages for escalation to a human.
Classify the LATEST customer message into exactly one category:
- refund: the customer is requesting a refund/their money back.
- payment_failure: a payment/billing failure (declined card, double charge, overcharge).
- outage: the product/service is down or not working for them now.
- legal: legal threats, lawsuits, data-breach/GDPR complaints.
- angry: the customer is clearly hostile/abusive/very upset.
- human_requested: the customer explicitly asks for a human/agent.
- none: a normal question or none of the above.

Rules to avoid false positives:
- Judge intent in context. Negations and hypotheticals do NOT count ("I do not want a refund", "what if the site went down").
- Mere mentions of a topic are not escalations; the customer must actually be expressing that need now.
- If unsure, use "none" with low confidence.

Respond ONLY with JSON:
{"escalate": boolean, "category": "...", "priority": "URGENT|HIGH|MEDIUM|LOW", "reason": "<short>", "confidence": 0.0-1.0}`;

/** LLM classification. Returns null on any failure (caller falls back to rules). */
async function classifyWithLLM(message: string): Promise<LLMResult | null> {
  try {
    const res = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CLASSIFY_PROMPT },
        { role: "user", content: message },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = llmResultSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function mapLlmCategory(c: LLMResult["category"]): EscalationCategory | null {
  return c === "none" ? null : c;
}

/**
 * Combine rule + LLM signals into a final decision.
 *
 * Precedence:
 *  - LLM available & confident & category enabled → escalate (LLM priority,
 *    bumped one level if the rule layer corroborates the same category).
 *  - LLM available but says no → trust it (precision), UNLESS a custom keyword
 *    matched (an explicit org-chosen trigger), which still escalates.
 *  - LLM unavailable → deterministic fallback: escalate on any enabled rule hit
 *    (errs toward recall so we don't miss escalations while the LLM is down).
 */
export async function detectEscalation(
  message: string,
  rules: EscalationRules,
): Promise<EscalationDecision> {
  const ruleHits = ruleDetect(message, rules);
  const llm = await classifyWithLLM(message);

  if (llm) {
    const cat = mapLlmCategory(llm.category);
    const confirmed =
      llm.escalate &&
      llm.confidence >= 0.5 &&
      cat !== null &&
      categoryEnabled(cat, rules);

    if (confirmed && cat) {
      let priority = higherOf(llm.priority, CATEGORY_PRIORITY[cat]);
      const corroborated = ruleHits.includes(cat);
      if (corroborated) priority = bumpUp(priority);
      return {
        escalate: true,
        category: cat,
        priority,
        reason: llm.reason || `${cat.replace("_", " ")} detected`,
        signals: { rule: corroborated, llm: true },
      };
    }

    // LLM said no — but honor explicit org custom keywords.
    if (ruleHits.includes("custom")) {
      return {
        escalate: true,
        category: "custom",
        priority: CATEGORY_PRIORITY.custom,
        reason: "Matched a custom escalation keyword",
        signals: { rule: true, llm: false },
      };
    }
    return {
      escalate: false,
      category: cat,
      priority: "LOW",
      reason: llm.reason || "No escalation needed",
      signals: { rule: ruleHits.length > 0, llm: false },
    };
  }

  // LLM unavailable → deterministic fallback on enabled rule hits.
  const enabledHits = ruleHits.filter((c) => categoryEnabled(c, rules));
  if (enabledHits.length > 0) {
    const cat = enabledHits.reduce((best, c) =>
      PRIORITY_ORDER.indexOf(CATEGORY_PRIORITY[c]) >
      PRIORITY_ORDER.indexOf(CATEGORY_PRIORITY[best])
        ? c
        : best,
    );
    return {
      escalate: true,
      category: cat,
      priority: CATEGORY_PRIORITY[cat],
      reason: `Keyword match (${cat.replace("_", " ")})`,
      signals: { rule: true, llm: false },
    };
  }
  return {
    escalate: false,
    category: null,
    priority: "LOW",
    reason: "No escalation signals",
    signals: { rule: false, llm: false },
  };
}

export interface EscalateInput {
  organizationId: string;
  conversationId: string;
  message: string;
  customerName?: string | null;
  customerEmail?: string | null;
}

/**
 * Run detection for a chat turn and, if triggered, create a flagged Ticket +
 * an EscalationEvent linked to it. Returns the event (or null if no escalation).
 * Loads the org's BotConfig escalation rules.
 */
export async function escalateConversation(
  input: EscalateInput,
): Promise<{ escalated: boolean; priority?: Priority; ticketId?: string }> {
  const config = await getConfig(input.organizationId);
  const decision = await detectEscalation(input.message, config.escalationRules);
  if (!decision.escalate || !decision.category) return { escalated: false };

  const ticket = await createTicket(input.organizationId, {
    customerName: input.customerName || "Website visitor",
    customerEmail: input.customerEmail || "unknown@widget.local",
    query: input.message,
    priority: decision.priority,
    conversationId: input.conversationId,
  });

  await prisma.escalationEvent.create({
    data: {
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      ticketId: ticket.id,
      reason: decision.reason,
      priority: decision.priority,
    },
  });

  return { escalated: true, priority: decision.priority, ticketId: ticket.id };
}

export interface EscalationListItem {
  id: string;
  reason: string;
  priority: Priority;
  createdAt: Date;
  conversationId: string;
  ticket: {
    id: string;
    customerName: string;
    customerEmail: string;
    query: string;
    status: string;
  } | null;
}

/** Escalation events for an org, grouped by priority (for GET /escalations). */
export async function listEscalationsGrouped(
  organizationId: string,
): Promise<Record<Priority, EscalationListItem[]>> {
  const events = await prisma.escalationEvent.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      ticket: {
        select: {
          id: true,
          customerName: true,
          customerEmail: true,
          query: true,
          status: true,
        },
      },
    },
  });

  const grouped: Record<Priority, EscalationListItem[]> = {
    URGENT: [],
    HIGH: [],
    MEDIUM: [],
    LOW: [],
  };
  for (const e of events) {
    grouped[e.priority].push({
      id: e.id,
      reason: e.reason,
      priority: e.priority,
      createdAt: e.createdAt,
      conversationId: e.conversationId,
      ticket: e.ticket,
    });
  }
  return grouped;
}
