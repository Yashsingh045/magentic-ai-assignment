import { z } from "zod";

export const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  /** Continue an existing conversation; omitted/unknown starts a new one. */
  conversationId: z.string().optional(),
  customerName: z.string().trim().max(120).optional(),
  customerEmail: z.string().email().optional(),
  /** Accepted in the body as a fallback to the x-api-key header. */
  publicApiKey: z.string().optional(),
});

export type ChatInput = z.infer<typeof chatSchema>;
