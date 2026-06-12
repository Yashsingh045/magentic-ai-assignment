import { z } from "zod";

export const ticketStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);
export const ticketPrioritySchema = z.enum([
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

export const createTicketSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z.string().email(),
  query: z.string().trim().min(1).max(2000),
  priority: ticketPrioritySchema.default("MEDIUM"),
  conversationId: z.string().optional(),
});

export const updateTicketSchema = z
  .object({
    status: ticketStatusSchema.optional(),
    priority: ticketPrioritySchema.optional(),
  })
  .refine((d) => d.status !== undefined || d.priority !== undefined, {
    message: "Provide status or priority to update",
  });

export const listTicketsQuerySchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
