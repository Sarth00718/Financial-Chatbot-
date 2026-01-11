/**
 * Local File Storage Utility
 * Handles file operations for local storage (replaces cloud storage)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory path (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define uploads directory path
const UPLOADS_DIR = path.join(__dirname, "../../uploads");

/**
 * Ensure uploads directory exists
 */
export const ensureUploadsDirectory = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log("📁 Created uploads directory");
  }
};

/**
 * Get the full path for an uploaded file
 * @param {string} filename - Name of the file
 * @returns {string} Full file path
 */
export const getFilePath = (filename) => {
  return path.join(UPLOADS_DIR, filename);
};

/**
 * Delete a file from local storage
 * @param {string} filename - Name of the file to delete
 * @returns {boolean} Success status
 */
export const deleteFile = (filename) => {
  try {
    const filePath = getFilePath(filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Deleted file: ${filename}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${filename}:`, error.message);
    return false;
  }
};

/**
 * Get file URL for local storage
 * @param {string} filename - Name of the file
 * @returns {string} File URL
 */
export const getFileUrl = (filename) => {
  return `/uploads/${filename}`;
};

export { UPLOADS_DIR };
