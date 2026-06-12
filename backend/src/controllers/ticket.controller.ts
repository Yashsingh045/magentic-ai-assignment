import { Request, Response } from "express";
import { getTenantId } from "../middleware/tenant";
import { listTicketsQuerySchema } from "../schemas/ticket.schema";
import * as ticketService from "../services/ticket.service";

export async function create(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  const ticket = await ticketService.createTicket(organizationId, req.body);
  res.status(201).json(ticket);
}

export async function list(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  // Validate query params (ZodError → 400). req.query is read-only in Express 5,
  // so we parse rather than reassign.
  const filters = listTicketsQuerySchema.parse(req.query);
  res.json(await ticketService.listTickets(organizationId, filters));
}

export async function update(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  const ticket = await ticketService.updateTicket(
    organizationId,
    String(req.params.id),
    req.body,
  );
  res.json(ticket);
}
