import { Request, Response } from "express";
import { getTenantId } from "../middleware/tenant";
import { getAnalytics } from "../services/analytics.service";

export async function analytics(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  res.json(await getAnalytics(organizationId));
}
