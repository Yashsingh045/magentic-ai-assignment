import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Org-scoped via the JWT (authenticate → getTenantId).
router.get("/stats", authenticate, dashboardController.stats);

export default router;
