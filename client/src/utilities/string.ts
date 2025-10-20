/**
 * Converts a string to a web-safe display ID format
 * @param input - The string to convert
 * @returns A normalized, web-safe string suitable for use as a URL slug or display ID
 */
export const toDisplayId = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};
