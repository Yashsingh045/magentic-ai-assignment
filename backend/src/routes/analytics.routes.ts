import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, analyticsController.analytics);

export default router;
