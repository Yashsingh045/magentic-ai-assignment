import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type {
  EscalationRules,
  UpdateConfigInput,
} from "../schemas/config.schema";

/** Sensible defaults so a fresh org's bot escalates out of the box. */
const DEFAULT_RULES: EscalationRules = {
  refundRequested: true,
  legalComplaint: true,
  customerAngry: true,
  humanRequested: true,
  customKeywords: [],
};

export interface BotConfigView {
  id: string;
  organizationId: string;
  botName: string;
  welcomeMessage: string;
  personality: "PROFESSIONAL" | "FRIENDLY" | "TECHNICAL";
  escalationRules: EscalationRules;
}

/**
 * BotConfig.escalationRules is a free-form Json column (default "{}").
 * Normalize it into the full typed shape on read, filling any missing keys with
 * defaults, so the API/UI always get a complete object.
 */
function normalizeRules(raw: unknown): EscalationRules {
  const r =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const bool = (v: unknown, fallback: boolean) =>
    typeof v === "boolean" ? v : fallback;
  return {
    refundRequested: bool(r.refundRequested, DEFAULT_RULES.refundRequested),
    legalComplaint: bool(r.legalComplaint, DEFAULT_RULES.legalComplaint),
    customerAngry: bool(r.customerAngry, DEFAULT_RULES.customerAngry),
    humanRequested: bool(r.humanRequested, DEFAULT_RULES.humanRequested),
    customKeywords: Array.isArray(r.customKeywords)
      ? r.customKeywords.filter((k): k is string => typeof k === "string")
      : [],
  };
}

function toView(c: {
  id: string;
  organizationId: string;
  botName: string;
  welcomeMessage: string;
  personality: BotConfigView["personality"];
  escalationRules: Prisma.JsonValue;
}): BotConfigView {
  return {
    id: c.id,
    organizationId: c.organizationId,
    botName: c.botName,
    welcomeMessage: c.welcomeMessage,
    personality: c.personality,
    escalationRules: normalizeRules(c.escalationRules),
  };
}

/** Get the org's BotConfig (created at registration; self-heals if missing). */
export async function getConfig(
  organizationId: string,
): Promise<BotConfigView> {
  const config =
    (await prisma.botConfig.findUnique({ where: { organizationId } })) ??
    (await prisma.botConfig.create({ data: { organizationId } }));
  return toView(config);
}

/** Replace the org's BotConfig (upsert keeps it robust if the row is missing). */
export async function updateConfig(
  organizationId: string,
  input: UpdateConfigInput,
): Promise<BotConfigView> {
  const data = {
    botName: input.botName,
    welcomeMessage: input.welcomeMessage,
    personality: input.personality,
    escalationRules: input.escalationRules as Prisma.InputJsonValue,
  };
  const config = await prisma.botConfig.upsert({
    where: { organizationId },
    update: data,
    create: { organizationId, ...data },
  });
  return toView(config);
}
