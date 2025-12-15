/**
 * Fuzzy search utilities for client-side text matching
 * 
 * Provides case-insensitive substring matching for filtering lists
 */

/**
 * Performs a fuzzy match between a query and text
 * Uses case-insensitive substring matching
 * 
 * @param query - The search query string
 * @param text - The text to search within
 * @returns true if the query matches the text, false otherwise
 */
export const fuzzyMatch = (query: string, text: string): boolean => {
  if (!query || !text) {
    return false;
  }
  
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedText = String(text).toLowerCase();
  
  if (normalizedQuery.length === 0) {
    return true; // Empty query matches everything
  }
  
  return normalizedText.includes(normalizedQuery);
};

/**
 * Performs fuzzy matching across multiple text fields
 * Returns true if the query matches any of the provided texts
 * 
 * @param query - The search query string
 * @param texts - Array of text strings to search within
 * @returns true if the query matches any text, false otherwise
 */
export const fuzzyMatchAny = (query: string, texts: (string | null | undefined)[]): boolean => {
  if (!query || texts.length === 0) {
    return !query || query.trim().length === 0;
  }
  
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return true;
  }
  
  return texts.some(text => {
    if (!text) return false;
    return String(text).toLowerCase().includes(normalizedQuery);
  });
};


