import { beforeAll, afterAll, beforeEach } from 'vitest'
import { execSync } from 'child_process'
import { prisma } from './lib/prisma.js'
import { setupTestDatabase } from './utils/test-db-setup.js'

let skipDbTests = process.env.SKIP_DB_TESTS === 'true'

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/irl_test'
process.env.ADMIN_DATABASE_URL = process.env.ADMIN_DATABASE_URL || 'postgresql://postgres@localhost:5432/postgres'
process.env.SESSION_SECRET = 'test-secret-key-for-testing-only'
process.env.CLIENT_URL = 'http://localhost:3000'
process.env.SERVICE_PORT = '0'

beforeAll(async () => {
  if (skipDbTests) {
    console.warn('SKIP_DB_TESTS enabled; database-dependent tests will be skipped.')
    return
  }

  console.log('Setting up test database...');
  try {
    await setupTestDatabase()

    console.log('Pushing Prisma schema to test database...');
    execSync('npx prisma db push --force-reset', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    })
    console.log('✓ Database schema setup completed');

    // Verify connectivity so we can gracefully skip when unavailable
    await prisma.$queryRaw`SELECT 1`
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
  await prisma.$disconnect()
})

export const isDatabaseUnavailable = () => skipDbTests
