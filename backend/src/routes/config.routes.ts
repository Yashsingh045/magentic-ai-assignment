import { Router } from "express";
import * as configController from "../controllers/config.controller";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { updateConfigSchema } from "../schemas/config.schema";

const router = Router();

router.get("/", authenticate, configController.get);
router.put(
  "/",
  authenticate,
  validateBody(updateConfigSchema),
  configController.update,
);

export default router;
