import { Router } from "express";
import * as documentController from "../controllers/document.controller";
import { authenticate } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

// All routes JWT-authed + org-scoped via getTenantId.
router.post("/", authenticate, upload.single("file"), documentController.create);
router.get("/", authenticate, documentController.list);
router.post("/reindex", authenticate, documentController.reindex);
router.delete("/:id", authenticate, documentController.remove);

export default router;
