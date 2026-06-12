import { Request, Response } from "express";
import { getTenantId } from "../middleware/tenant";
import { listConversationsQuerySchema } from "../schemas/conversation.schema";
import * as conversationService from "../services/conversation.service";

export async function list(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  const query = listConversationsQuerySchema.parse(req.query);
  res.json(await conversationService.listConversations(organizationId, query));
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  res.json(
    await conversationService.getConversation(
      organizationId,
      String(req.params.id),
    ),
  );
}
