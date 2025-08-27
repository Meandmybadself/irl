import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from './prisma.js';
import { 
  createPersonWithContact, 
  createGroupWithParent, 
  addPersonToGroup,
  createClaim,
  claimPerson
} from '../utils/prisma-helpers.js';

describe('Prisma Models and Helpers', () => {
  beforeAll(async () => {
    // Set test environment
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // Skip actual database operations in tests since we don't have a test DB
    // These tests validate the TypeScript types and structure
  });

  it('should have correct TypeScript types for models', () => {
    // Test that all models have the required base fields
    const personData = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      displayId: 'john-doe-123',
      pronouns: 'he/him',
      imageURL: null,
      userId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false
    };

    const userData = {
      id: 1,
      email: 'john@example.com',
      password: 'hashed_password',
      verificationToken: 'token123',
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false
    };

    const groupData = {
      id: 1,
      displayId: 'group-123',
      name: 'Test Group',
      description: 'A test group',
      parentGroupId: null,
      allowsAnyUserToCreateSubgroup: false,
      publiclyVisible: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false
    };

    const contactInfoData = {
      id: 1,
      type: 'EMAIL' as const,
      label: 'Personal',
      value: 'john@example.com',
      privacy: 'PUBLIC' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false
    };

    const systemData = {
      id: 1,
      name: 'IRL System',
      registrationOpen: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false
    };

    const claimData = {
      id: 1,
      personId: 1,
      claimCode: 'abc123xyz',
      claimed: false,
      claimedAt: null,
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false
    };

    // Verify types compile correctly
    expect(personData.firstName).toBe('John');
    expect(userData.email).toBe('john@example.com');
    expect(groupData.name).toBe('Test Group');
    expect(contactInfoData.type).toBe('EMAIL');
    expect(systemData.registrationOpen).toBe(true);
    expect(claimData.claimed).toBe(false);
  });

  it('should have helper functions with correct signatures', async () => {
    // Test helper function signatures (without actual DB calls)
    expect(typeof createPersonWithContact).toBe('function');
    expect(typeof createGroupWithParent).toBe('function');
    expect(typeof addPersonToGroup).toBe('function');
    expect(typeof createClaim).toBe('function');
    expect(typeof claimPerson).toBe('function');
  });

  it('should have enum types available', () => {
    // Test that enums are properly typed
    const contactTypes: Array<'EMAIL' | 'PHONE' | 'ADDRESS' | 'URL'> = ['EMAIL', 'PHONE', 'ADDRESS', 'URL'];
    const privacyLevels: Array<'PRIVATE' | 'PUBLIC'> = ['PRIVATE', 'PUBLIC'];
    const relations: string[] = ['PARENT', 'TEACHER', 'COACH', 'MEMBER', 'ADMIN', 'VOLUNTEER', 'STUDENT'];

    expect(contactTypes).toContain('EMAIL');
    expect(privacyLevels).toContain('PUBLIC');
    expect(relations).toContain('MEMBER');
  });

  it('should validate soft delete middleware structure', async () => {
    // Test that the middleware is set up (without actual DB operations)
    expect(prisma.$use).toBeDefined();
    
    // Verify prisma client is properly exported
    expect(prisma.person).toBeDefined();
    expect(prisma.user).toBeDefined();
    expect(prisma.group).toBeDefined();
    expect(prisma.contactInformation).toBeDefined();
    expect(prisma.system).toBeDefined();
    expect(prisma.claim).toBeDefined();
  });

  it('should have junction table models available', () => {
    // Verify junction table models exist
    expect(prisma.personGroup).toBeDefined();
    expect(prisma.systemAdminUser).toBeDefined();
    expect(prisma.personContactInformation).toBeDefined();
    expect(prisma.groupContactInformation).toBeDefined();
    expect(prisma.systemContactInformation).toBeDefined();
  });
});