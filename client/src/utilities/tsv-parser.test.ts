import { describe, it, expect } from 'vitest';
import { parseTSV, parsePersonsFromTSV, parseGroupsFromTSV } from './tsv-parser.js';

describe('TSV Parser', () => {
  describe('parseTSV - Edge Cases', () => {
    it('should handle Windows line endings (\\r\\n)', () => {
      const tsvWithWindowsLineEndings = 'Name\tAge\r\nJohn\t30\r\nJane\t25';
      const result = parseTSV(tsvWithWindowsLineEndings);
      
      expect(result).toEqual([
        ['Name', 'Age'],
        ['John', '30'],
        ['Jane', '25']
      ]);
    });

    it('should handle Unix line endings (\\n)', () => {
      const tsvWithUnixLineEndings = 'Name\tAge\nJohn\t30\nJane\t25';
      const result = parseTSV(tsvWithUnixLineEndings);
      
      expect(result).toEqual([
        ['Name', 'Age'],
        ['John', '30'],
        ['Jane', '25']
      ]);
    });

    it('should handle tabs within quoted fields', () => {
      const tsvWithTabsInData = 'Name\tAddress\nJohn\t"123\tMain St"';
      const result = parseTSV(tsvWithTabsInData);
      
      expect(result).toEqual([
        ['Name', 'Address'],
        ['John', '123\tMain St']
      ]);
    });

    it('should handle newlines within quoted fields', () => {
      const tsvWithNewlinesInData = 'Name\tAddress\nJohn\t"123 Main St\nApt 4B"';
      const result = parseTSV(tsvWithNewlinesInData);
      
      expect(result).toEqual([
        ['Name', 'Address'],
        ['John', '123 Main St\nApt 4B']
      ]);
    });

    it('should handle missing trailing tabs', () => {
      const tsvWithMissingTrailingTabs = 'Name\tAge\tCity\nJohn\t30\nJane\t25\tNYC';
      const result = parseTSV(tsvWithMissingTrailingTabs);
      
      expect(result).toEqual([
        ['Name', 'Age', 'City'],
        ['John', '30', ''],
        ['Jane', '25', 'NYC']
      ]);
    });

    it('should trim whitespace from cells', () => {
      const tsvWithWhitespace = 'Name\tAge\n  John  \t  30  ';
      const result = parseTSV(tsvWithWhitespace);
      
      expect(result).toEqual([
        ['Name', 'Age'],
        ['John', '30']
      ]);
    });

    it('should skip empty lines', () => {
      const tsvWithEmptyLines = 'Name\tAge\n\nJohn\t30\n\nJane\t25\n\n';
      const result = parseTSV(tsvWithEmptyLines);
      
      expect(result).toEqual([
        ['Name', 'Age'],
        ['John', '30'],
        ['Jane', '25']
      ]);
    });

    it('should handle escaped quotes in quoted fields', () => {
      const tsvWithEscapedQuotes = 'Name\tQuote\nJohn\t"He said ""Hello"""';
      const result = parseTSV(tsvWithEscapedQuotes);
      
      expect(result).toEqual([
        ['Name', 'Quote'],
        ['John', 'He said "Hello"']
      ]);
    });

    it('should handle mixed line endings', () => {
      const tsvWithMixedLineEndings = 'Name\tAge\r\nJohn\t30\nJane\t25\r\n';
      const result = parseTSV(tsvWithMixedLineEndings);
      
      expect(result).toEqual([
        ['Name', 'Age'],
        ['John', '30'],
        ['Jane', '25']
      ]);
    });
  });

  describe('parsePersonsFromTSV', () => {
    it('should parse valid persons data', () => {
      const tsv = 'FirstName\tLastName\tDisplayID\tPronouns\tImageURL\nJohn\tDoe\tjohn123\the/him\thttps://example.com/john.jpg';
      const result = parsePersonsFromTSV(tsv, 1);
      
      expect(result.data).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.data[0]).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        displayId: 'john123',
        pronouns: 'he/him',
        imageURL: 'https://example.com/john.jpg',
        userId: 1
      });
    });

    it('should handle persons with contact information', () => {
      const tsv = 'John\tDoe\tjohn123\the/him\t\tEmail\tWork\tjohn@example.com\tPublic';
      const result = parsePersonsFromTSV(tsv, 1);
      
      expect(result.data).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.data[0].contactInformations).toHaveLength(1);
      expect(result.data[0].contactInformations![0]).toMatchObject({
        type: 'EMAIL',
        label: 'Work',
        value: 'john@example.com',
        privacy: 'PUBLIC'
      });
    });

    it('should handle persons with address containing newlines', () => {
      const tsv = 'John\tDoe\tjohn123\the/him\t\tAddress\tHome\t"123 Main St\nApt 4B\nNew York, NY"\tPrivate';
      const result = parsePersonsFromTSV(tsv, 1);
      
      expect(result.data).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.data[0].contactInformations).toHaveLength(1);
      expect(result.data[0].contactInformations![0]).toMatchObject({
        type: 'ADDRESS',
        label: 'Home',
        value: '123 Main St\nApt 4B\nNew York, NY',
        privacy: 'PRIVATE'
      });
    });

    it('should report errors for missing required fields', () => {
      const tsv = 'FirstName\tLastName\tDisplayID\nJohn\t\tjohn123';
      const result = parsePersonsFromTSV(tsv, 1);
      
      expect(result.data).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Missing required fields');
    });

    it('should validate email addresses', () => {
      const tsv = 'John\tDoe\tjohn123\the/him\t\tEmail\tWork\tinvalid-email\tPublic';
      const result = parsePersonsFromTSV(tsv, 1);
      
      expect(result.data).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Invalid email');
    });

    it('should validate phone numbers', () => {
      const tsv = 'John\tDoe\tjohn123\the/him\t\tPhone\tWork\t123\tPublic';
      const result = parsePersonsFromTSV(tsv, 1);
      
      expect(result.data).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Phone must be between 7 and 15 digits');
    });
  });

  describe('parseGroupsFromTSV', () => {
    it('should parse valid groups data', () => {
      const tsv = 'Name\tDisplayID\tDescription\tPubliclyVisible\tAllowsAnyUserToCreateSubgroup\tParentGroupDisplayID\nEngineer Team\teng-team\tEngineering group\ttrue\tfalse\t';
      const result = parseGroupsFromTSV(tsv);
      
      expect(result.data).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.data[0]).toMatchObject({
        name: 'Engineer Team',
        displayId: 'eng-team',
        description: 'Engineering group',
        publiclyVisible: true,
        allowsAnyUserToCreateSubgroup: false,
        parentGroupDisplayId: null
      });
    });

    it('should handle groups with contact information containing tabs', () => {
      const tsv = 'Team\tteam1\tTeam description\ttrue\tfalse\t\tAddress\tOffice\t"123\tMain St"\tPublic';
      const result = parseGroupsFromTSV(tsv);
      
      expect(result.data).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.data[0].contactInformations).toHaveLength(1);
      expect(result.data[0].contactInformations![0]).toMatchObject({
        type: 'ADDRESS',
        label: 'Office',
        value: '123\tMain St',
        privacy: 'PUBLIC'
      });
    });

    it('should parse groups with parent group displayId', () => {
      const tsv = 'Name\tDisplayID\tDescription\tPubliclyVisible\tAllowsAnyUserToCreateSubgroup\tParentGroupDisplayID\nTeam\tteam\tTest\ttrue\tfalse\tparent-group';
      const result = parseGroupsFromTSV(tsv);
      
      expect(result.data).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.data[0]).toMatchObject({
        name: 'Team',
        displayId: 'team',
        parentGroupDisplayId: 'parent-group'
      });
    });

    it('should handle missing trailing fields gracefully', () => {
      const tsv = 'Name\tDisplayID\tDescription\tPubliclyVisible\tAllowsAnyUserToCreateSubgroup\tParentGroupDisplayID\nTeam 1\tteam1\nTeam 2\tteam2\tDescription\ttrue';
      const result = parseGroupsFromTSV(tsv);
      
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });
});

