import multer from "multer";
import { AppError } from "./error";
import { resolveFileType } from "../utils/fileParsers";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * In-memory upload handler — the buffer is parsed/embedded immediately, so we
 * never need to persist the raw file to disk. Rejects unsupported types up
 * front (→ 400 via the AppError) and caps size (→ MulterError handled in
 * errorHandler).
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (resolveFileType(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `Unsupported file type: ${file.originalname}`));
    }
  },
});
