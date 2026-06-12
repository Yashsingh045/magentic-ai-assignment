import { Router } from "express";
import * as escalationController from "../controllers/escalation.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Org-scoped, grouped by priority.
router.get("/", authenticate, escalationController.listGrouped);

export default router;
