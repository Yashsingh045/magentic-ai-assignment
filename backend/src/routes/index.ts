import { Router } from "express";
import { health } from "../controllers/health.controller";
import authRouter from "./auth.routes";
import chatRouter from "./chat.routes";
import configRouter from "./config.routes";
import dashboardRouter from "./dashboard.routes";
import documentRouter from "./document.routes";
import escalationRouter from "./escalation.routes";
import ticketRouter from "./ticket.routes";

/**
 * Root API router (mounted at /api). Feature routers — auth, dashboard,
 * documents, config, chat, conversations, tickets, escalations, analytics —
 * are added here as each feature is built.
 */
const router = Router();

router.get("/health", health);

router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/documents", documentRouter);
router.use("/config", configRouter);
router.use("/chat", chatRouter);
// router.use("/conversations", conversationsRouter);
router.use("/tickets", ticketRouter);
router.use("/escalations", escalationRouter);
// router.use("/analytics", analyticsRouter);

export default router;
