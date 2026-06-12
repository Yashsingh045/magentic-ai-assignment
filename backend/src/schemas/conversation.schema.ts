import { z } from "zod";

export const listConversationsQuerySchema = z.object({
  /** Free-text search across customer name/email and message content. */
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListConversationsQuery = z.infer<
  typeof listConversationsQuerySchema
>;
