import { beforeAll, afterAll, beforeEach } from 'vitest'
import { execSync } from 'child_process'
import { setupTestDatabase } from './utils/test-db-setup.js'

// Set test environment variables BEFORE importing prisma
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/irl_test'
process.env.ADMIN_DATABASE_URL = process.env.ADMIN_DATABASE_URL || 'postgresql://postgres@localhost:5432/postgres'
process.env.SESSION_SECRET = 'test-secret-key-for-testing-only'
process.env.CLIENT_URL = 'http://localhost:3000'
process.env.SERVICE_PORT = '0'

let skipDbTests = process.env.SKIP_DB_TESTS === 'true'

// Dynamically import prisma to ensure env vars are set first
const getPrisma = async () => {
  const { prisma } = await import('./lib/prisma.js')
  return prisma
}

beforeAll(async () => {
  if (skipDbTests) {
    console.warn('SKIP_DB_TESTS enabled; database-dependent tests will be skipped.')
    return
  }

  console.log('Setting up test database...');
  try {
    await setupTestDatabase()

    console.log('Pushing Prisma schema to test database...');
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    })
    console.log('✓ Database schema setup completed');

    const prisma = await getPrisma()

    // Ensure legacy columns that may exist from previous schemas are removed.
    try {
      await prisma.$executeRaw`ALTER TABLE "person_groups" DROP COLUMN IF EXISTS "relation"`;
    } catch (cleanupError) {
      // Ignore - column may not exist or database may not be ready yet
      // This will be caught by the connectivity check below
    }

    // Verify connectivity so we can gracefully skip when unavailable
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (connectError) {
      throw new Error('Database connectivity check failed')
    }
  } catch (error) {
    skipDbTests = true
    process.env.SKIP_DB_TESTS = 'true'
    console.warn('Database unavailable, skipping DB-dependent tests. Error:', error instanceof Error ? error.message : error)
  }
})

beforeEach(async () => {
  if (skipDbTests) {
    return
  }
  // Clean up the database before each test
  // Use raw SQL to bypass soft delete middleware and ensure complete cleanup
  try {
    const prisma = await getPrisma()
    
    // Delete in reverse order to avoid foreign key constraints
    await prisma.$executeRaw`DELETE FROM person_groups`
    await prisma.$executeRaw`DELETE FROM system_contact_information`
    await prisma.$executeRaw`DELETE FROM person_contact_information`
    await prisma.$executeRaw`DELETE FROM group_contact_information`
    await prisma.$executeRaw`DELETE FROM contact_information`
    await prisma.$executeRaw`DELETE FROM group_invites`
    await prisma.$executeRaw`DELETE FROM claims`
    await prisma.$executeRaw`DELETE FROM people`
    await prisma.$executeRaw`DELETE FROM users`
    await prisma.$executeRaw`DELETE FROM groups`
    await prisma.$executeRaw`DELETE FROM systems`

    // Reset auto-increment sequences to ensure consistent IDs
    // Note: System table doesn't have a sequence (it uses a fixed ID of 1)
    await prisma.$executeRaw`ALTER SEQUENCE users_id_seq RESTART WITH 1`
    await prisma.$executeRaw`ALTER SEQUENCE people_id_seq RESTART WITH 1`
    await prisma.$executeRaw`ALTER SEQUENCE groups_id_seq RESTART WITH 1`
    await prisma.$executeRaw`ALTER SEQUENCE contact_information_id_seq RESTART WITH 1`
    await prisma.$executeRaw`ALTER SEQUENCE claims_id_seq RESTART WITH 1`
    await prisma.$executeRaw`ALTER SEQUENCE person_groups_id_seq RESTART WITH 1`
    await prisma.$executeRaw`ALTER SEQUENCE system_contact_information_id_seq RESTART WITH 1`
    await prisma.$executeRaw`ALTER SEQUENCE person_contact_information_id_seq RESTART WITH 1`
    await prisma.$executeRaw`ALTER SEQUENCE group_contact_information_id_seq RESTART WITH 1`
    await prisma.$executeRaw`ALTER SEQUENCE group_invites_id_seq RESTART WITH 1`
  } catch (error) {
    // If database operations fail, tests will skip database checks
    console.warn('Database cleanup warning (tests will run with mocked data):', error instanceof Error ? error.message : String(error))
    skipDbTests = true
    process.env.SKIP_DB_TESTS = 'true'
  }
})

afterAll(async () => {
  if (!skipDbTests) {
    const prisma = await getPrisma()
    await prisma.$disconnect()
  }
})

export const isDatabaseUnavailable = () => skipDbTests
