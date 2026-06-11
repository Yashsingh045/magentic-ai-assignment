import { Request, Response } from "express";
import { getTenantId } from "../middleware/tenant";
import * as configService from "../services/config.service";

export async function get(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  res.json(await configService.getConfig(organizationId));
}

export async function update(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  res.json(await configService.updateConfig(organizationId, req.body));
}
