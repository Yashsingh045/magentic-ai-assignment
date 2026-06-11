import { z } from "zod";

export const personalitySchema = z.enum([
  "PROFESSIONAL",
  "FRIENDLY",
  "TECHNICAL",
]);

export const escalationRulesSchema = z.object({
  refundRequested: z.boolean(),
  legalComplaint: z.boolean(),
  customerAngry: z.boolean(),
  humanRequested: z.boolean(),
  customKeywords: z
    .array(z.string().trim().min(1).max(40))
    .max(50)
    .default([]),
});

export const updateConfigSchema = z.object({
  botName: z.string().trim().min(1).max(60),
  welcomeMessage: z.string().trim().min(1).max(500),
  personality: personalitySchema,
  escalationRules: escalationRulesSchema,
});

export type EscalationRules = z.infer<typeof escalationRulesSchema>;
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;
