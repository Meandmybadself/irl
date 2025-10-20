/**
 * Input sanitization utilities for defense-in-depth security
 *
 * While Prisma ORM provides protection against SQL injection through parameterized queries,
 * these utilities provide an additional layer of defense by sanitizing user input before
 * it reaches the database layer.
 */

/**
 * SQL injection patterns to detect and remove
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|CAST|CONVERT)\b)/gi,
  /(--|;|\/\*|\*\/|xp_|sp_)/gi,
  /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
  /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
  /(\'|\"|\`)/g,
  /(\bNULL\b|\bIS\b|\bLIKE\b)/gi,
];

/**
 * Characters that should be escaped in search queries
 */
const SPECIAL_CHARS = /[%_\\]/g;

/**
 * Sanitizes a search query string by:
 * 1. Trimming whitespace
 * 2. Removing SQL injection patterns
 * 3. Escaping special SQL characters
 * 4. Limiting length
 *
 * @param query - The search query to sanitize
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized query string
 */
export function sanitizeSearchQuery(query: string | undefined | null, maxLength: number = 100): string {
  if (!query) {
    return '';
  }

  // Convert to string and trim
  let sanitized = String(query).trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove SQL injection patterns
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Escape special SQL wildcard characters
  sanitized = sanitized.replace(SPECIAL_CHARS, '\\$&');

  // Remove any remaining non-printable characters
  sanitized = sanitized.replace(/[^\x20-\x7E]/g, '');

  return sanitized.trim();
}

/**
 * Sanitizes a numeric ID parameter
 *
 * @param id - The ID to sanitize
 * @returns Sanitized number or NaN if invalid
 */
export function sanitizeNumericId(id: string | number | undefined | null): number {
  if (id === undefined || id === null) {
    return NaN;
  }

  const parsed = typeof id === 'number' ? id : parseInt(String(id), 10);

  // Ensure it's a valid positive integer
  if (isNaN(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
    return NaN;
  }

  return parsed;
}

/**
 * Validates and sanitizes pagination parameters
 *
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @param maxLimit - Maximum allowed limit (default: 100)
 * @returns Sanitized pagination params with skip and take values
 */
export function sanitizePaginationParams(
  page: string | number | undefined,
  limit: string | number | undefined,
  maxLimit: number = 100
): { page: number; limit: number; skip: number } {
  const sanitizedPage = Math.max(1, sanitizeNumericId(page) || 1);
  const sanitizedLimit = Math.min(maxLimit, Math.max(1, sanitizeNumericId(limit) || 10));
  const skip = (sanitizedPage - 1) * sanitizedLimit;

  return {
    page: sanitizedPage,
    limit: sanitizedLimit,
    skip
  };
}

/**
 * Sanitizes a string to be used as an email address
 *
 * @param email - Email to sanitize
 * @returns Sanitized email or empty string
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email) {
    return '';
  }

  // Convert to lowercase and trim
  let sanitized = String(email).toLowerCase().trim();

  // Remove any characters that aren't valid in email addresses
  sanitized = sanitized.replace(/[^a-z0-9@._+-]/g, '');

  // Limit length
  if (sanitized.length > 254) {
    sanitized = sanitized.substring(0, 254);
  }

  return sanitized;
}

/**
 * Sanitizes a displayId (URL slug) parameter
 *
 * @param displayId - The displayId to sanitize
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized displayId
 */
export function sanitizeDisplayId(displayId: string | undefined | null, maxLength: number = 100): string {
  if (!displayId) {
    return '';
  }

  let sanitized = String(displayId).toLowerCase().trim();

  // Only allow alphanumeric, hyphens, and underscores
  sanitized = sanitized.replace(/[^a-z0-9-_]/g, '');

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}
