import { Request, Response } from "express";
import { getTenantId } from "../middleware/tenant";
import { AppError } from "../middleware/error";
import * as documentService from "../services/document.service";

export async function create(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  if (!req.file) {
    throw new AppError(400, "No file uploaded (expected form field 'file')");
  }
  const document = await documentService.createDocument(organizationId, req.file);
  res.status(201).json(document);
}

export async function list(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  res.json(await documentService.listDocuments(organizationId));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  await documentService.deleteDocument(organizationId, String(req.params.id));
  res.status(204).end();
}

export async function reindex(req: Request, res: Response): Promise<void> {
  const organizationId = getTenantId(req);
  res.json(await documentService.reindexDocuments(organizationId));
}
