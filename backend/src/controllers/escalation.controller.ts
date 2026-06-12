import { Request, Response } from "express";
import { getTenantId } from "../middleware/tenant";
import { listEscalationsGrouped } from "../services/escalation.service";

export async function listGrouped(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  res.json(await listEscalationsGrouped(organizationId));
}
