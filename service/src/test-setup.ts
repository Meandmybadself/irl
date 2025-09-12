import { beforeAll, afterAll, beforeEach } from 'vitest'
import { execSync } from 'child_process'
import { prisma } from './lib/prisma.js'

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/irl_test'
process.env.SESSION_SECRET = 'test-secret-key-for-testing-only'
process.env.CLIENT_URL = 'http://localhost:3000'
process.env.SERVICE_PORT = '0'

beforeAll(async () => {
  // Push the schema to the test database
  try {
    execSync('npx prisma db push --force-reset', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    })
  } catch (error) {
    console.warn('Database setup warning (this is normal if no test DB is available):', error instanceof Error ? error.message : error)
  }
})

beforeEach(async () => {
  // Clean up the database before each test
  // Delete in reverse order to avoid foreign key constraints
  try {
    await prisma.personGroup.deleteMany({})
    await prisma.systemContactInformation.deleteMany({})
    await prisma.personContactInformation.deleteMany({})
    await prisma.groupContactInformation.deleteMany({})
    await prisma.contactInformation.deleteMany({})
    await prisma.groupInvite.deleteMany({})
    await prisma.claim.deleteMany({})
    await prisma.person.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.group.deleteMany({})
    await prisma.system.deleteMany({})
  } catch (error) {
    // If database operations fail, tests will skip database checks
    console.warn('Database cleanup warning (tests will run with mocked data):', error instanceof Error ? error.message : error)
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})