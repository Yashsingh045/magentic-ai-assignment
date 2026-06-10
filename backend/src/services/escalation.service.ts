/**
 * Escalation logic. After a chat turn, decide whether the query should become a
 * Ticket and/or fire an EscalationEvent (e.g. unresolved, urgent keywords, low
 * retrieval confidence) based on the org's BotConfig.escalationRules.
 *
 * Scaffold: signature defined; rule evaluation lands with the escalation
 * feature. Org-scoped via organizationId.
 */
import { Priority } from "@prisma/client";

export interface EscalationDecision {
  shouldEscalate: boolean;
  priority: Priority;
  reason: string;
}

export interface EscalationInput {
  organizationId: string;
  query: string;
  answered: boolean;
  topDistance?: number;
}

export async function evaluateEscalation(
  _input: EscalationInput,
): Promise<EscalationDecision> {
  // TODO: load BotConfig.escalationRules and evaluate against the input.
  return { shouldEscalate: false, priority: "LOW", reason: "" };
}
