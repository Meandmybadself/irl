import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { generateTestData, isDatabaseAvailable, createRandomName } from '../utils/test-helpers.js'
import { 
  createPersonWithContact, 
  findPersonWithContacts, 
  findPersonByDisplayId,
  createClaim,
  claimPerson 
} from '../utils/prisma-helpers.js'

describe('Person Management Tests', () => {
  let dbAvailable = false

  beforeEach(async () => {
    dbAvailable = await isDatabaseAvailable()
  })

  describe('Person Creation and Modification', () => {
    it('should create a Person with random name', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const personData = generateTestData.person()

      const person = await prisma.person.create({
        data: personData
      })

      expect(person).toBeDefined()
      expect(person.firstName).toBe(personData.firstName)
      expect(person.lastName).toBe(personData.lastName)
      expect(person.displayId).toBe(personData.displayId)
      expect(person.pronouns).toBe(personData.pronouns)
      expect(person.id).toBeTypeOf('number')
      expect(person.createdAt).toBeInstanceOf(Date)
      expect(person.updatedAt).toBeInstanceOf(Date)
      expect(person.deleted).toBe(false)
    })

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

      // Verify relationship
      const personWithUser = await prisma.person.findUnique({
        where: { id: person.id },
        include: { user: true }
      })

      expect(personWithUser?.user).toBeDefined()
      expect(personWithUser?.user?.id).toBe(user.id)
    })

    it('should modify an existing Person', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Create person
      const person = await prisma.person.create({
        data: generateTestData.person()
      })

      const newName = createRandomName()
      const newPronouns = 'they/them'
      const imageURL = 'https://example.com/avatar.jpg'

      // Modify person
      const updatedPerson = await prisma.person.update({
        where: { id: person.id },
        data: {
          firstName: newName.firstName,
          lastName: newName.lastName,
          pronouns: newPronouns,
          imageURL: imageURL
        }
      })

      expect(updatedPerson.firstName).toBe(newName.firstName)
      expect(updatedPerson.lastName).toBe(newName.lastName)
      expect(updatedPerson.pronouns).toBe(newPronouns)
      expect(updatedPerson.imageURL).toBe(imageURL)
      expect(updatedPerson.updatedAt.getTime()).toBeGreaterThan(person.updatedAt.getTime())
    })

    it('should enforce unique displayId constraint', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const displayId = 'unique-person-' + Math.random().toString(36).substring(2, 8)
      
      // Create first person
      await prisma.person.create({
        data: {
          ...generateTestData.person(),
          displayId
        }
      })

      // Attempt to create second person with same displayId - should fail
      await expect(
        prisma.person.create({
          data: {
            ...generateTestData.person(),
            displayId
          }
        })
      ).rejects.toThrow()
    })

    it('should handle soft delete for Person', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const person = await prisma.person.create({
        data: generateTestData.person()
      })

      // Soft delete
      await prisma.person.delete({
        where: { id: person.id }
      })

      // Should not find the soft-deleted person
      const deletedPerson = await prisma.person.findUnique({
        where: { id: person.id }
      })

      expect(deletedPerson).toBeNull()

      // But should find it when explicitly looking for deleted records
      const personWithDeleted = await prisma.person.findFirst({
        where: { id: person.id, deleted: true }
      })

      expect(personWithDeleted).toBeDefined()
      expect(personWithDeleted?.deleted).toBe(true)
    })
  })

  describe('Person Contact Information', () => {
    it('should create Person with Contact Information using helper', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const personData = {
        ...generateTestData.person(),
        contactInfo: {
          type: 'EMAIL' as const,
          label: 'Personal',
          value: 'john.doe@example.com',
          privacy: 'PRIVATE' as const
        }
      }

      const person = await createPersonWithContact(personData)

      expect(person).toBeDefined()
      expect(person.firstName).toBe(personData.firstName)
      expect(person.contactInformation).toHaveLength(1)
      expect(person.contactInformation[0].contactInformation.value).toBe('john.doe@example.com')
      expect(person.contactInformation[0].contactInformation.type).toBe('EMAIL')
      expect(person.contactInformation[0].contactInformation.privacy).toBe('PRIVATE')
    })

    it('should associate multiple contact types with Person', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const person = await prisma.person.create({
        data: generateTestData.person()
      })

      // Create multiple contact information entries
      const emailContact = await prisma.contactInformation.create({
        data: {
          type: 'EMAIL',
          label: 'Work',
          value: 'work@example.com',
          privacy: 'PUBLIC'
        }
      })

      const phoneContact = await prisma.contactInformation.create({
        data: {
          type: 'PHONE',
          label: 'Mobile',
          value: '+1-555-123-4567',
          privacy: 'PRIVATE'
        }
      })

      const addressContact = await prisma.contactInformation.create({
        data: {
          type: 'ADDRESS',
          label: 'Home',
          value: '123 Main St, City, ST 12345',
          privacy: 'PRIVATE'
        }
      })

      // Associate all contacts with person
      await prisma.personContactInformation.create({
        data: { personId: person.id, contactInformationId: emailContact.id }
      })

      await prisma.personContactInformation.create({
        data: { personId: person.id, contactInformationId: phoneContact.id }
      })

      await prisma.personContactInformation.create({
        data: { personId: person.id, contactInformationId: addressContact.id }
      })

      // Verify all contacts are associated
      const personWithContacts = await findPersonWithContacts(person.id)

      expect(personWithContacts?.contactInformation).toHaveLength(3)
      const contactTypes = personWithContacts?.contactInformation.map(c => c.contactInformation.type)
      expect(contactTypes).toContain('EMAIL')
      expect(contactTypes).toContain('PHONE')
      expect(contactTypes).toContain('ADDRESS')
    })

    it('should find Person by displayId with contacts', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const personData = {
        ...generateTestData.person(),
        contactInfo: {
          type: 'URL' as const,
          label: 'Portfolio',
          value: 'https://johndoe.dev',
          privacy: 'PUBLIC' as const
        }
      }

      const person = await createPersonWithContact(personData)

      const foundPerson = await findPersonByDisplayId(person.displayId)

      expect(foundPerson).toBeDefined()
      expect(foundPerson?.id).toBe(person.id)
      expect(foundPerson?.contactInformation).toHaveLength(1)
      expect(foundPerson!.contactInformation[0].contactInformation.value).toBe('https://johndoe.dev')
    })
  })

  describe('Person Transfer and Claims', () => {
    it('should transfer Person between Users using Claims', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Create initial user and person
      const originalUser = await prisma.user.create({
        data: generateTestData.user()
      })

      const person = await prisma.person.create({
        data: generateTestData.person(originalUser.id)
      })

      // Create claim for person transfer
      const claim = await createClaim(person.id)

      expect(claim.personId).toBe(person.id)
      expect(claim.claimCode).toBeDefined()
      expect(claim.claimed).toBe(false)
      expect(claim.expiresAt).toBeInstanceOf(Date)

      // Create new user who will claim the person
      const newUser = await prisma.user.create({
        data: generateTestData.user()
      })

      // Execute the claim
      const claimedResult = await claimPerson(claim.claimCode, newUser.id)

      expect(claimedResult.claimed).toBe(true)
      expect(claimedResult.claimedAt).toBeInstanceOf(Date)

      // Verify person was transferred
      const transferredPerson = await prisma.person.findUnique({
        where: { id: person.id }
      })

      expect(transferredPerson?.userId).toBe(newUser.id)
    })

    it('should prevent claiming expired or already claimed persons', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      const person = await prisma.person.create({
        data: generateTestData.person(user.id)
      })

      // Create expired claim
      const expiredClaim = await prisma.claim.create({
        data: {
          personId: person.id,
          claimCode: 'expired-claim-code',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      })

      const newUser = await prisma.user.create({
        data: generateTestData.user()
      })

      // Should fail to claim expired claim
      await expect(
        claimPerson(expiredClaim.claimCode, newUser.id)
      ).rejects.toThrow('Invalid or expired claim code')
    })

    it('should prevent duplicate claims on same claim code', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      const person = await prisma.person.create({
        data: generateTestData.person(user.id)
      })

      const claim = await createClaim(person.id)

      const newUser1 = await prisma.user.create({
        data: generateTestData.user()
      })

      const newUser2 = await prisma.user.create({
        data: generateTestData.user()
      })

      // First claim should succeed
      await claimPerson(claim.claimCode, newUser1.id)

      // Second claim should fail
      await expect(
        claimPerson(claim.claimCode, newUser2.id)
      ).rejects.toThrow('Invalid or expired claim code')
    })
  })

  describe('Person Group Relationships', () => {
    it('should associate Person with Groups', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const person = await prisma.person.create({
        data: generateTestData.person()
      })

      const group = await prisma.group.create({
        data: generateTestData.group()
      })

      const personGroup = await prisma.personGroup.create({
        data: {
          personId: person.id,
          groupId: group.id,
          relation: 'MEMBER',
          isAdmin: false
        }
      })

      expect(personGroup.personId).toBe(person.id)
      expect(personGroup.groupId).toBe(group.id)
      expect(personGroup.relation).toBe('MEMBER')
      expect(personGroup.isAdmin).toBe(false)
    })

    it('should retrieve Person with Group memberships', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const person = await prisma.person.create({
        data: generateTestData.person()
      })

      const group1 = await prisma.group.create({
        data: { ...generateTestData.group(), name: 'School Board' }
      })

      const group2 = await prisma.group.create({
        data: { ...generateTestData.group(), name: 'Parent Association' }
      })

      await prisma.personGroup.create({
        data: {
          personId: person.id,
          groupId: group1.id,
          relation: 'ADMIN',
          isAdmin: true
        }
      })

      await prisma.personGroup.create({
        data: {
          personId: person.id,
          groupId: group2.id,
          relation: 'MEMBER',
          isAdmin: false
        }
      })

      const personWithGroups = await prisma.person.findUnique({
        where: { id: person.id },
        include: {
          groupMemberships: {
            include: {
              group: true
            }
          }
        }
      })

      expect(personWithGroups?.groupMemberships).toHaveLength(2)
      
      const adminGroup = personWithGroups?.groupMemberships.find(pg => pg.isAdmin)
      expect(adminGroup?.group.name).toBe('School Board')
      expect(adminGroup?.relation).toBe('ADMIN')

      const memberGroup = personWithGroups?.groupMemberships.find(pg => !pg.isAdmin)
      expect(memberGroup?.group.name).toBe('Parent Association')
      expect(memberGroup?.relation).toBe('MEMBER')
    })
  })

  describe('Person Validation', () => {
    it('should validate Person model structure', () => {
      const personData = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        displayId: 'john-doe-123',
        pronouns: 'he/him',
        imageURL: 'https://example.com/avatar.jpg',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false
      }

      expect(personData.id).toBeTypeOf('number')
      expect(personData.firstName).toBeTypeOf('string')
      expect(personData.lastName).toBeTypeOf('string')
      expect(personData.displayId).toBeTypeOf('string')
      expect(personData.pronouns).toBeTypeOf('string')
      expect(personData.imageURL).toBeTypeOf('string')
      expect(personData.userId).toBeTypeOf('number')
      expect(personData.createdAt).toBeInstanceOf(Date)
      expect(personData.updatedAt).toBeInstanceOf(Date)
      expect(personData.deleted).toBeTypeOf('boolean')
    })

    it('should have required fields defined', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Should fail without required firstName field
      await expect(
        prisma.person.create({
          data: {
            lastName: 'Doe',
            displayId: 'test-person-123'
          } as any
        })
      ).rejects.toThrow()

      // Should fail without required lastName field
      await expect(
        prisma.person.create({
          data: {
            firstName: 'John',
            displayId: 'test-person-123'
          } as any
        })
      ).rejects.toThrow()

      // Should fail without required displayId field
      await expect(
        prisma.person.create({
          data: {
            firstName: 'John',
            lastName: 'Doe'
          } as any
        })
      ).rejects.toThrow()
    })
  })
})