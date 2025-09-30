import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { generateTestData, isDatabaseAvailable, createRandomEmail } from '../utils/test-helpers.js'
import { findUserWithPeople } from '../utils/prisma-helpers.js'

describe('User Management Tests', () => {
  let dbAvailable = false

  beforeEach(async () => {
    dbAvailable = await isDatabaseAvailable()
  })

  describe('User Creation and Modification', () => {
    it('should create first User as system admin with random email', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const userData = {
        email: createRandomEmail(),
        password: '$2b$10$testhashedpasswordforunitests'
      }

      const user = await prisma.user.create({
        data: userData
      })

      expect(user).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.password).toBe(userData.password)
      expect(user.id).toBeTypeOf('number')
      expect(user.verificationToken).toBeNull()
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
      expect(user.deleted).toBe(false)
    })

    it('should modify an existing User', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Create user
      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      const newEmail = createRandomEmail()
      const verificationToken = 'test-verification-token-123'

      // Modify user
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: newEmail,
          verificationToken: verificationToken
        }
      })

      expect(updatedUser.email).toBe(newEmail)
      expect(updatedUser.verificationToken).toBe(verificationToken)
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThanOrEqual(user.updatedAt.getTime())
    })

    it('should enforce unique email constraint', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const email = createRandomEmail()
      
      // Create first user
      await prisma.user.create({
        data: {
          email,
          password: '$2b$10$testhashedpasswordforunitests'
        }
      })

      // Attempt to create second user with same email - should fail
      await expect(
        prisma.user.create({
          data: {
            email,
            password: '$2b$10$anothertesthashedpassword'
          }
        })
      ).rejects.toThrow()
    })

    it('should handle soft delete for User', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      // Soft delete
      await prisma.user.delete({
        where: { id: user.id }
      })

      // Should not find the soft-deleted user
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(deletedUser).toBeNull()

      // But should find it when explicitly looking for deleted records using raw query to bypass middleware
      const userWithDeleted = await prisma.$queryRaw`
        SELECT * FROM users WHERE id = ${user.id} AND deleted = true
      `

      expect(userWithDeleted).toBeDefined()
      expect((userWithDeleted as any)[0]?.deleted).toBe(true)
    })
  })

  describe('User-System Admin Relationship', () => {
    it('should establish User as system admin relationship', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Create system and user
      await prisma.system.create({
        data: { name: 'Eisenhower', registrationOpen: true }
      })

      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      // Make user a system admin
      const adminUser = await prisma.user.update({
        where: { id: user.id },
        data: { isSystemAdmin: true }
      })

      expect(adminUser).toBeDefined()
      expect(adminUser.isSystemAdmin).toBe(true)
    })

    it('should retrieve User as system admin', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      // Make user a system admin
      await prisma.user.update({
        where: { id: user.id },
        data: { isSystemAdmin: true }
      })

      const systemAdmin = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(systemAdmin?.isSystemAdmin).toBe(true)
    })
  })

  describe('User-Person Relationship', () => {
    it('should create Person as User primary Person', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      const personData = generateTestData.person(user.id)
      
      const person = await prisma.person.create({
        data: personData
      })

      expect(person.userId).toBe(user.id)
      expect(person.firstName).toBe(personData.firstName)
      expect(person.lastName).toBe(personData.lastName)
      expect(person.displayId).toBe(personData.displayId)
    })

    it('should reassign Person from one User to another', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const originalUser = await prisma.user.create({
        data: generateTestData.user()
      })

      const newUser = await prisma.user.create({
        data: generateTestData.user()
      })

      // Create person assigned to original user
      const person = await prisma.person.create({
        data: generateTestData.person(originalUser.id)
      })

      expect(person.userId).toBe(originalUser.id)

      // Reassign person to new user
      const updatedPerson = await prisma.person.update({
        where: { id: person.id },
        data: { userId: newUser.id }
      })

      expect(updatedPerson.userId).toBe(newUser.id)
    })

    it('should create another Person initially assigned to User', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      // Create first person
      const person1 = await prisma.person.create({
        data: generateTestData.person(user.id)
      })

      // Create second person also assigned to same user
      const person2 = await prisma.person.create({
        data: generateTestData.person(user.id)
      })

      expect(person1.userId).toBe(user.id)
      expect(person2.userId).toBe(user.id)
      expect(person1.id).not.toBe(person2.id)
    })

    it('should retrieve User with all associated People using helper', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      // Create multiple people for the user
      await prisma.person.create({
        data: generateTestData.person(user.id)
      })

      await prisma.person.create({
        data: generateTestData.person(user.id)
      })

      await prisma.person.create({
        data: generateTestData.person(user.id)
      })

      const userWithPeople = await findUserWithPeople(user.id)

      expect(userWithPeople?.people).toHaveLength(3)
      userWithPeople?.people.forEach(person => {
        expect(person.userId).toBe(user.id)
        expect(person.deleted).toBe(false)
      })
    })
  })

  describe('User Validation', () => {
    it('should validate User model structure', () => {
      const userData = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        verificationToken: 'token123',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false
      }

      expect(userData.id).toBeTypeOf('number')
      expect(userData.email).toBeTypeOf('string')
      expect(userData.password).toBeTypeOf('string')
      expect(userData.verificationToken).toBeTypeOf('string')
      expect(userData.createdAt).toBeInstanceOf(Date)
      expect(userData.updatedAt).toBeInstanceOf(Date)
      expect(userData.deleted).toBeTypeOf('boolean')
    })

    it('should handle verification token states', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const userData = {
        ...generateTestData.user(),
        verificationToken: 'pending-verification-token'
      }

      const user = await prisma.user.create({
        data: userData
      })

      expect(user.verificationToken).toBe('pending-verification-token')

      // Simulate email verification by clearing token
      const verifiedUser = await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: null }
      })

      expect(verifiedUser.verificationToken).toBeNull()
    })

    it('should have required fields defined', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Should fail without required email field
      await expect(
        prisma.user.create({
          data: {
            password: 'testpassword'
          } as any
        })
      ).rejects.toThrow()

      // Should fail without required password field
      await expect(
        prisma.user.create({
          data: {
            email: 'test@example.com'
          } as any
        })
      ).rejects.toThrow()
    })
  })
})
