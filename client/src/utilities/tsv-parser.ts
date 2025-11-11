import Papa from 'papaparse';
import { validateEmail } from './validation.js';
import type { ContactInformation } from '@irl/shared';

export type ContactInformationInput = Omit<ContactInformation, 'id' | 'createdAt' | 'updatedAt'>;

export interface ParsedPerson {
  firstName: string;
  lastName: string;
  displayId: string;
  pronouns?: string | null;
  imageURL?: string | null;
  userId: number;
  contactInformations?: ContactInformationInput[];
}

export interface ParsedGroup {
  name: string;
  displayId: string;
  description?: string | null;
  publiclyVisible?: boolean;
  allowsAnyUserToCreateSubgroup?: boolean;
  parentGroupDisplayId?: string | null;
  contactInformations?: ContactInformationInput[];
}

export interface ParseResult<T> {
  data: T[];
  errors: Array<{
    row: number;
    error: string;
  }>;
}

/**
 * Validate phone number
 * Basic validation - non-empty and reasonable length
 */
const validatePhone = (phone: string): string | null => {
  if (!phone) {
    return 'Phone is required';
  }
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\+\.]/g, '');
  // Check if it contains only digits after cleaning
  if (!/^\d+$/.test(cleaned)) {
    return 'Phone must contain only numbers and common formatting characters';
  }
  // Check reasonable length (between 7 and 15 digits)
  if (cleaned.length < 7 || cleaned.length > 15) {
    return 'Phone must be between 7 and 15 digits';
  }
  return null;
};

/**
 * Parse TSV text into rows and columns using papaparse.
 * This properly handles:
 * - Different line endings (Windows \r\n vs Unix \n)
 * - Quoted fields (data containing tabs or newlines)
 * - Missing trailing tabs
 * - Edge cases in TSV parsing
 */
export const parseTSV = (text: string): string[][] => {
  // Normalize line endings to handle mixed \r\n and \n
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const result = Papa.parse<string[]>(normalizedText, {
    delimiter: '\t',
    skipEmptyLines: 'greedy', // Skip rows with all empty fields
    quoteChar: '"',
    escapeChar: '"',
  });

  if (result.errors && result.errors.length > 0) {
    console.warn('TSV parsing warnings:', result.errors);
  }

  // Filter out any rows that are just a single empty string
  const filteredData = result.data.filter((row: string[]) => {
    return !(row.length === 1 && row[0] === '');
  });

  // Find the maximum column count to handle missing trailing tabs
  const maxColumns = Math.max(...filteredData.map(row => row.length));

  // Trim whitespace from each cell and pad rows to consistent length
  return filteredData.map((row: string[]) => {
    const trimmedRow = row.map((cell: string) => (cell || '').trim());
    // Pad with empty strings if row is shorter than max
    while (trimmedRow.length < maxColumns) {
      trimmedRow.push('');
    }
    return trimmedRow;
  });
};

/**
 * Parse contact information from row starting at a specific column index
 * Contact info pattern: type, label, value, privacy (repeating)
 * Returns both valid contact infos and validation errors
 */
const parseContactInformations = (
  row: string[], 
  startIndex: number
): { contactInfos: ContactInformationInput[]; errors: string[] } => {
  const contactInfos: ContactInformationInput[] = [];
  const errors: string[] = [];

  for (let i = startIndex; i < row.length; i += 4) {
    const type = row[i]?.toUpperCase();
    const label = row[i + 1];
    const value = row[i + 2];
    const privacy = row[i + 3]?.toUpperCase();

    // Skip if any required field is missing
    if (!type || !label || !value || !privacy) {
      break;
    }

    // Validate type
    if (!['EMAIL', 'PHONE', 'ADDRESS', 'URL'].includes(type)) {
      errors.push(`Invalid contact type: ${type}`);
      break;
    }

    // Validate privacy
    if (!['PRIVATE', 'PUBLIC'].includes(privacy)) {
      errors.push(`Invalid privacy setting: ${privacy}`);
      break;
    }

    // Validate value based on type
    if (type === 'EMAIL') {
      const emailError = validateEmail(value);
      if (emailError) {
        errors.push(`Invalid email '${value}': ${emailError}`);
        continue;
      }
    } else if (type === 'PHONE') {
      const phoneError = validatePhone(value);
      if (phoneError) {
        errors.push(`Invalid phone '${value}': ${phoneError}`);
        continue;
      }
    }

    contactInfos.push({
      type: type as ContactInformation['type'],
      label,
      value,
      privacy: privacy as ContactInformation['privacy']
    });
  }

  return { contactInfos, errors };
};

/**
 * Parse persons from TSV text
 * Expected format: firstName, lastName, displayId, pronouns, imageURL, contactType1, contactLabel1, contactValue1, contactPrivacy1, ...
 */
export const parsePersonsFromTSV = (text: string, userId: number): ParseResult<ParsedPerson> => {
  const rows = parseTSV(text);
  const data: ParsedPerson[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  // Skip header row if present
  const hasHeader = rows[0]?.some(cell => 
    cell.toLowerCase().includes('firstname') ||
    cell.toLowerCase().includes('first') ||
    cell.toLowerCase().includes('name')
  );
  const startRow = hasHeader ? 1 : 0;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];

    // Skip empty rows
    if (row.length === 0 || row.every(cell => !cell)) {
      continue;
    }

    try {
      const firstName = row[0];
      const lastName = row[1];
      const displayId = row[2];
      const pronouns = row[3] || null;
      const imageURL = row[4] || null;

      // Validate required fields
      if (!firstName || !lastName || !displayId) {
        errors.push({
          row: i + 1,
          error: 'Missing required fields (firstName, lastName, or displayId)'
        });
        continue;
      }

      // Parse contact informations starting at column 5
      const { contactInfos, errors: contactErrors } = parseContactInformations(row, 5);

      // If there are validation errors, add them and skip this row
      if (contactErrors.length > 0) {
        errors.push({
          row: i + 1,
          error: contactErrors.join('; ')
        });
        continue;
      }

      data.push({
        firstName,
        lastName,
        displayId,
        pronouns,
        imageURL,
        userId,
        contactInformations: contactInfos.length > 0 ? contactInfos : undefined
      });
    } catch (error) {
      errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error parsing row'
      });
    }
  }

  return { data, errors };
};

/**
 * Parse groups from TSV text
 * Expected format: name, displayId, description, publiclyVisible, allowsAnyUserToCreateSubgroup, parentGroupDisplayId, contactType1, contactLabel1, contactValue1, contactPrivacy1, ...
 */
export const parseGroupsFromTSV = (text: string): ParseResult<ParsedGroup> => {
  const rows = parseTSV(text);
  const data: ParsedGroup[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  // Skip header row if present
  const hasHeader = rows[0]?.some(cell =>
    cell.toLowerCase().includes('name') ||
    cell.toLowerCase().includes('displayid')
  );
  const startRow = hasHeader ? 1 : 0;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];

    // Skip empty rows
    if (row.length === 0 || row.every(cell => !cell)) {
      continue;
    }

    try {
      const name = row[0];
      const displayId = row[1];
      const description = row[2] || null;
      const publiclyVisible = row[3] ? row[3].toLowerCase() === 'true' : true;
      const allowsAnyUserToCreateSubgroup = row[4] ? row[4].toLowerCase() === 'true' : false;
      const parentGroupDisplayId = row[5] || null;

      // Validate required fields
      if (!name || !displayId) {
        errors.push({
          row: i + 1,
          error: 'Missing required fields (name or displayId)'
        });
        continue;
      }

      // Parse contact informations starting at column 6
      const { contactInfos, errors: contactErrors } = parseContactInformations(row, 6);

      // If there are validation errors, add them and skip this row
      if (contactErrors.length > 0) {
        errors.push({
          row: i + 1,
          error: contactErrors.join('; ')
        });
        continue;
      }

      data.push({
        name,
        displayId,
        description,
        publiclyVisible,
        allowsAnyUserToCreateSubgroup,
        parentGroupDisplayId,
        contactInformations: contactInfos.length > 0 ? contactInfos : undefined
      });
    } catch (error) {
      errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error parsing row'
      });
    }
  }

  return { data, errors };
};
