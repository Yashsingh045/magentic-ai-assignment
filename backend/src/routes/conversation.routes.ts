import { Router } from "express";
import * as conversationController from "../controllers/conversation.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, conversationController.list);
router.get("/:id", authenticate, conversationController.getOne);

export default router;
