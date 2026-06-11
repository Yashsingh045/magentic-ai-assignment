import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import { resolveFileType } from "../utils/fileParsers";
import { indexDocument, reindexOrganization } from "./indexing.service";

export interface DocumentListItem {
  id: string;
  filename: string;
  fileType: string;
  status: string;
  sizeBytes: number;
  uploadedAt: Date;
  chunkCount: number;
}

/**
 * Persist a Document as PROCESSING, then kick off indexing in the background.
 * We return immediately so the UI can show PROCESSING and poll; indexDocument
 * flips the status to INDEXED or FAILED when it finishes.
 */
export async function createDocument(
  organizationId: string,
  file: Express.Multer.File,
) {
  const resolved = resolveFileType(file.originalname, file.mimetype);
  if (!resolved) {
    throw new AppError(400, `Unsupported file type: ${file.originalname}`);
  }

  const document = await prisma.document.create({
    data: {
      organizationId,
      filename: file.originalname,
      fileType: resolved.label,
      status: "PROCESSING",
      sizeBytes: file.size,
    },
  });

  // Fire-and-forget: the buffer only exists during this request.
  void indexDocument({
    organizationId,
    documentId: document.id,
    buffer: file.buffer,
    mimeType: resolved.mime,
  }).catch((err) =>
    console.error(`Indexing failed for document ${document.id}:`, err),
  );

  return document;
}

export async function listDocuments(
  organizationId: string,
): Promise<DocumentListItem[]> {
  const docs = await prisma.document.findMany({
    where: { organizationId },
    orderBy: { uploadedAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return docs.map((d) => ({
    id: d.id,
    filename: d.filename,
    fileType: d.fileType,
    status: d.status,
    sizeBytes: d.sizeBytes,
    uploadedAt: d.uploadedAt,
    chunkCount: d._count.chunks,
  }));
}

/** Delete a document (chunks cascade via the schema's onDelete: Cascade). */
export async function deleteDocument(
  organizationId: string,
  id: string,
): Promise<void> {
  const { count } = await prisma.document.deleteMany({
    where: { id, organizationId }, // compound filter → tenant-scoped
  });
  if (count === 0) {
    throw new AppError(404, "Document not found");
  }
}

export async function reindexDocuments(organizationId: string) {
  return reindexOrganization(organizationId);
}
