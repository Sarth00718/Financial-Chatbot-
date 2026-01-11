/**
 * Application Constants
 * Central place for all constant values used across the application
 */

// Database name
export const DB_NAME = "FinanceChatbotDB";

// File upload limits
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
export const MAX_FILES_PER_UPLOAD = 10;

// Allowed file types for document upload
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
];

// Message roles
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

// Document processing status
export const DOCUMENT_STATUS = {
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed'
};

// Feature modes for conversations
export const FEATURE_MODES = {
  GENERAL: 'General_Conversation',
  DOCUMENT: 'Document_Analysis',
  ANALYTICAL: 'Analytical_Insights',
  MULTI_DOC: 'Multi_Document_Search',
  SMART: 'Smart_Chat'
};
