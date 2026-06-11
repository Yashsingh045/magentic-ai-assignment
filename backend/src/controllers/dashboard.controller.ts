import { Request, Response } from "express";
import { getTenantId } from "../middleware/tenant";
import { getDashboardStats } from "../services/dashboard.service";

export async function stats(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  const data = await getDashboardStats(organizationId);
  res.json(data);
}
