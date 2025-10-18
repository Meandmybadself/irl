/**
 * UI constants and configuration values
 */

// Timing constants (in milliseconds)
export const SEARCH_DEBOUNCE_MS = 300;

// Error messages
export const ERROR_MESSAGES = {
  CONTACT_INFO_REQUIRED: 'Label and value are required',
  CONTACT_INFO_CREATE_FAILED: 'Failed to create contact information',
  CONTACT_INFO_UPDATE_FAILED: 'Failed to update contact information',
  CONTACT_INFO_DELETE_FAILED: 'Failed to delete contact information',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN_ERROR: 'An unknown error occurred',
  SESSION_EXPIRED: 'Your session has expired',
  UNAUTHORIZED: 'You are not authorized to perform this action',
} as const;
