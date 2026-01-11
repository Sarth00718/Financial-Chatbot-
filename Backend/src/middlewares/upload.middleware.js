/**
 * File Upload Middleware
 * Handles file uploads using multer (local storage)
 * Replaces AWS S3 with local file system
 */

import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { UPLOADS_DIR, ensureUploadsDirectory } from "../utils/fileStorage.js";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "../config/constants.js";

// Ensure uploads directory exists
ensureUploadsDirectory();

/**
 * Configure multer storage
 * Files are saved to local uploads directory
 */
const storage = multer.diskStorage({
  // Set destination folder
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  // Set filename with timestamp to avoid conflicts
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

/**
 * File filter to validate file types
 */
const fileFilter = (req, file, cb) => {
  // Check if file type is allowed
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: PDF, Excel, CSV`
      ),
      false
    );
  }
};

/**
 * Configure multer upload
 */
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE, // 50MB limit
  },
  fileFilter: fileFilter,
});
