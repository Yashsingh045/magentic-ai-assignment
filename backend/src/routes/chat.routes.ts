import { Router } from "express";
import * as chatController from "../controllers/chat.controller";
import { chatLimiter } from "../middleware/rateLimit";
import { tenantFromApiKey } from "../middleware/tenant";
import { validateBody } from "../middleware/validate";
import { chatSchema } from "../schemas/chat.schema";

const router = Router();

/**
 * Public widget endpoint. No JWT — authed by the org's publicApiKey (x-api-key
 * header or body), org-scoped via tenantFromApiKey, and rate-limited per key.
 * tenantFromApiKey runs before validateBody so it can read publicApiKey from
 * the (as-yet unstripped) body as a fallback.
 */
router.post(
  "/",
  chatLimiter,
  tenantFromApiKey,
  validateBody(chatSchema),
  chatController.chat,
);

export default router;
