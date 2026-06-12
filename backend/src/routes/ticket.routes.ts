import { Router } from "express";
import * as ticketController from "../controllers/ticket.controller";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  createTicketSchema,
  updateTicketSchema,
} from "../schemas/ticket.schema";

const router = Router();

// All JWT-authed + org-scoped via getTenantId.
router.post("/", authenticate, validateBody(createTicketSchema), ticketController.create);
router.get("/", authenticate, ticketController.list);
router.patch("/:id", authenticate, validateBody(updateTicketSchema), ticketController.update);

export default router;
