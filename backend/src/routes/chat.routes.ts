import { Router } from "express";
import * as chatController from "../controllers/chat.controller";
import { chatLimiter } from "../middleware/rateLimit";
import { tenantFromApiKey } from "../middleware/tenant";
import { validateBody } from "../middleware/validate";
import { chatSchema } from "../schemas/chat.schema";

const router = Router();

/**
 * Public widget endpoints. No JWT — authed by the org's publicApiKey (x-api-key
 * header or body), org-scoped via tenantFromApiKey. Under /api/chat, which gets
 * open CORS (the widget runs on arbitrary customer domains).
 */

// Bot identity/welcome for the widget to render before any message.
router.get("/config", tenantFromApiKey, chatController.widgetConfig);

// Streaming chat (rate-limited per key). tenantFromApiKey runs before
// validateBody so it can read publicApiKey from the (unstripped) body fallback.
router.post(
  "/",
  chatLimiter,
  tenantFromApiKey,
  validateBody(chatSchema),
  chatController.chat,
);

export default router;
