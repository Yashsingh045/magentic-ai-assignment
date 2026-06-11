import mammoth from "mammoth";
import pdfParse from "pdf-parse";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type CanonicalMime =
  | "application/pdf"
  | typeof DOCX_MIME
  | "text/plain"
  | "text/markdown";

export interface ResolvedFileType {
  mime: CanonicalMime;
  label: "PDF" | "DOCX" | "TXT" | "MD";
}

/**
 * Resolve a supported file type from the upload's name + reported MIME type.
 * Browsers report inconsistent MIME types (e.g. .md as text/plain or
 * application/octet-stream), so we fall back to the extension. Returns null for
 * unsupported types — callers reject with a 400.
 */
export function resolveFileType(
  filename: string,
  mimetype: string,
): ResolvedFileType | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  if (mimetype === "application/pdf" || ext === "pdf")
    return { mime: "application/pdf", label: "PDF" };
  if (mimetype === DOCX_MIME || ext === "docx")
    return { mime: DOCX_MIME, label: "DOCX" };
  if (mimetype === "text/markdown" || ext === "md" || ext === "markdown")
    return { mime: "text/markdown", label: "MD" };
  if (mimetype === "text/plain" || ext === "txt")
    return { mime: "text/plain", label: "TXT" };
  return null;
}

/**
 * Extract raw text from an uploaded buffer based on its MIME type.
 * Throws if the type is unsupported so the caller can return a 400.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  switch (mimeType) {
    case "application/pdf": {
      const result = await pdfParse(buffer);
      return result.text;
    }
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case "text/plain":
    case "text/markdown":
      return buffer.toString("utf-8");
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Rough chars-per-token for English/code. text-embedding-3-small uses the
 * cl100k_base tokenizer where ~4 chars ≈ 1 token; we approximate by characters
 * to stay dependency-free (no tokenizer download) while sizing in "tokens".
 */
const CHARS_PER_TOKEN = 4;

export interface ChunkOptions {
  /** Target chunk size in tokens (approx). */
  maxTokens?: number;
  /** Overlap between consecutive chunks in tokens (approx). */
  overlapTokens?: number;
}

/**
 * Split text into overlapping, token-sized chunks for embedding.
 *
 * Defaults: ~800 tokens per chunk, ~100 tokens overlap. Chunk boundaries snap
 * to the nearest whitespace so we never cut a word in half. Overlap carries a
 * little context across boundaries so a fact split across two chunks is still
 * retrievable from either side.
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxTokens = options.maxTokens ?? 800;
  const overlapTokens = options.overlapTokens ?? 100;
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const overlapChars = Math.min(overlapTokens * CHARS_PER_TOKEN, maxChars - 1);

  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);
    // Snap back to a word boundary unless we're at the very end.
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }
    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;
    // Step forward, leaving an overlap window; always advance at least 1 char.
    start = Math.max(end - overlapChars, start + 1);
  }
  return chunks;
}
