/**
 * UI constants and configuration values
 */

// Timing constants (in milliseconds)
export const SEARCH_DEBOUNCE_MS = 300;

// Routes
export const ROUTES = {
  HOME: '/home',
  LOGIN: '/login',
  PROFILE: '/profile',
  PERSONS: '/persons',
  PERSONS_CREATE: '/persons/create',
  GROUPS: '/groups',
  GROUPS_CREATE: '/groups/create',
  ADMIN_SYSTEM: '/admin/system',
  ADMIN_USERS: '/admin/users',
} as const;

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

/**
 * Re-export standardized text and background colors for easy access
 * These utilities ensure consistent theming across the application
 * and handle both light and dark modes automatically.
 * 
 * @example
 * import { textColors, backgroundColors, textStyles } from './constants.js';
 * 
 * // Use in templates:
 * html`<div class="${backgroundColors.page}">`
 * html`<h1 class="${textStyles.heading.h1}">`
 */
export { textColors, textStyles, backgroundColors } from './utilities/text-colors.js';
