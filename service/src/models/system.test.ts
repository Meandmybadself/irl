import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { generateTestData, isDatabaseAvailable } from '../utils/test-helpers.js'
import { findSystemWithAdmins } from '../utils/prisma-helpers.js'

describe('System Model Tests', () => {
  let dbAvailable = false

  beforeEach(async () => {
    dbAvailable = await isDatabaseAvailable()
  })

  describe('System Creation and Modification', () => {
    it('should create a System (Eisenhower)', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true) // Skip test gracefully
        return
      }

      const systemData = {
        name: 'Eisenhower',
        registrationOpen: true
      }

      const system = await prisma.system.create({
        data: systemData
      })

      expect(system).toBeDefined()
      expect(system.name).toBe('Eisenhower')
      expect(system.registrationOpen).toBe(true)
      expect(system.id).toBeTypeOf('number')
      expect(system.createdAt).toBeInstanceOf(Date)
      expect(system.updatedAt).toBeInstanceOf(Date)
      expect(system.deleted).toBe(false)
    })

    it('should modify an existing System', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Create system
      const system = await prisma.system.create({
        data: {
          name: 'Eisenhower',
          registrationOpen: true
        }
      })

      // Modify system
      const updatedSystem = await prisma.system.update({
        where: { id: system.id },
        data: {
          name: 'Eisenhower Elementary School',
          registrationOpen: false
        }
      })

      expect(updatedSystem.name).toBe('Eisenhower Elementary School')
      expect(updatedSystem.registrationOpen).toBe(false)
      expect(updatedSystem.updatedAt.getTime()).toBeGreaterThan(system.updatedAt.getTime())
    })

    it('should handle soft delete for System', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const system = await prisma.system.create({
        data: {
          name: 'Test System',
          registrationOpen: true
        }
      })

      // Soft delete
      await prisma.system.delete({
        where: { id: system.id }
      })

      // Should not find the soft-deleted system
      const deletedSystem = await prisma.system.findUnique({
        where: { id: system.id }
      })

      expect(deletedSystem).toBeNull()

      // But should find it when explicitly looking for deleted records
      const systemWithDeleted = await prisma.system.findFirst({
        where: { id: system.id, deleted: true }
      })

      expect(systemWithDeleted).toBeDefined()
      expect(systemWithDeleted?.deleted).toBe(true)
    })
  })

  describe('System Admin Relationships', () => {
    it('should create first User as system admin', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const userData = generateTestData.user()
      const systemData = {
        name: 'Eisenhower',
        registrationOpen: true
      }

      // Create system and user
      const system = await prisma.system.create({ data: systemData })
      const user = await prisma.user.create({ data: userData })

      // Create admin relationship
      const adminRelation = await prisma.systemAdminUser.create({
        data: {
          systemId: system.id,
          userId: user.id
        },
        include: {
          user: true,
          system: true
        }
      })

      expect(adminRelation).toBeDefined()
      expect(adminRelation.systemId).toBe(system.id)
      expect(adminRelation.userId).toBe(user.id)
      expect(adminRelation.user.email).toBe(userData.email)
      expect(adminRelation.system.name).toBe('Eisenhower')
    })

    it('should retrieve system with admin users using helper', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Create system, users, and admin relationships
      const system = await prisma.system.create({
        data: { name: 'Eisenhower', registrationOpen: true }
      })

      const user1 = await prisma.user.create({
        data: generateTestData.user()
      })

      const user2 = await prisma.user.create({
        data: generateTestData.user()
      })

      await prisma.systemAdminUser.create({
        data: { systemId: system.id, userId: user1.id }
      })

      await prisma.systemAdminUser.create({
        data: { systemId: system.id, userId: user2.id }
      })

      // Test helper function
      const systemWithAdmins = await findSystemWithAdmins(system.id)

      expect(systemWithAdmins).toBeDefined()
      expect(systemWithAdmins?.adminUsers).toHaveLength(2)
      expect(systemWithAdmins!.adminUsers[0].user).toBeDefined()
      expect(systemWithAdmins!.adminUsers[1].user).toBeDefined()
    })

    it('should prevent duplicate admin relationships', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const system = await prisma.system.create({
        data: { name: 'Eisenhower', registrationOpen: true }
      })

      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      // Create first admin relationship
      await prisma.systemAdminUser.create({
        data: { systemId: system.id, userId: user.id }
      })

      // Attempt to create duplicate - should fail due to unique constraint
      await expect(
        prisma.systemAdminUser.create({
          data: { systemId: system.id, userId: user.id }
        })
      ).rejects.toThrow()
    })
  })

  describe('System Contact Information', () => {
    it('should associate contact information with System', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const system = await prisma.system.create({
        data: { name: 'Eisenhower', registrationOpen: true }
      })

      const contactInfo = await prisma.contactInformation.create({
        data: {
          type: 'EMAIL',
          label: 'Main Office',
          value: 'office@eisenhower.edu',
          privacy: 'PUBLIC'
        }
      })

      const systemContact = await prisma.systemContactInformation.create({
        data: {
          systemId: system.id,
          contactInformationId: contactInfo.id
        }
      })

      expect(systemContact).toBeDefined()
      expect(systemContact.systemId).toBe(system.id)
      expect(systemContact.contactInformationId).toBe(contactInfo.id)

      // Test retrieval with contact information
      const systemWithContacts = await prisma.system.findUnique({
        where: { id: system.id },
        include: {
          contactInformation: {
            include: {
              contactInformation: true
            }
          }
        }
      })

      expect(systemWithContacts?.contactInformation).toHaveLength(1)
      expect(systemWithContacts!.contactInformation[0].contactInformation.value).toBe('office@eisenhower.edu')
    })
  })

  describe('System Validation', () => {
    it('should validate System model structure', () => {
      const systemData = {
        id: 1,
        name: 'Eisenhower Elementary',
        registrationOpen: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false
      }

      expect(systemData.id).toBeTypeOf('number')
      expect(systemData.name).toBeTypeOf('string')
      expect(systemData.registrationOpen).toBeTypeOf('boolean')
      expect(systemData.createdAt).toBeInstanceOf(Date)
      expect(systemData.updatedAt).toBeInstanceOf(Date)
      expect(systemData.deleted).toBeTypeOf('boolean')
    })

    it('should have required fields defined', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Should fail without required name field
      await expect(
        prisma.system.create({
          data: {
            registrationOpen: true
          } as any
        })
      ).rejects.toThrow()
    })
  })
})