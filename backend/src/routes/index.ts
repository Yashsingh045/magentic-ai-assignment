import { Router } from "express";
import { health } from "../controllers/health.controller";

/**
 * Root API router (mounted at /api). Feature routers — auth, dashboard,
 * documents, config, chat, conversations, tickets, escalations, analytics —
 * are added here as each feature is built.
 */
const router = Router();

router.get("/health", health);

// router.use("/auth", authRouter);
// router.use("/dashboard", dashboardRouter);
// router.use("/documents", documentsRouter);
// router.use("/config", configRouter);
// router.use("/chat", chatRouter);
// router.use("/conversations", conversationsRouter);
// router.use("/tickets", ticketsRouter);
// router.use("/escalations", escalationsRouter);
// router.use("/analytics", analyticsRouter);

export default router;
