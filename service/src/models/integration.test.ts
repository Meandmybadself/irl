import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { generateTestData, isDatabaseAvailable } from '../utils/test-helpers.js'
import { 
  createPersonWithContact,
  createGroupWithParent,
  addPersonToGroup,
  createClaim,
  claimPerson,
  findSystemWithAdmins,
  findUserWithPeople,
  findGroupWithMembers
} from '../utils/prisma-helpers.js'

describe('Integration Tests - Model Relationships and Validation', () => {
  let dbAvailable = false

  beforeEach(async () => {
    dbAvailable = await isDatabaseAvailable()
  })

  describe('Complete System Setup Integration Test', () => {
    it('should create complete system as specified in GitHub issue', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // 1. Create or update System (Eisenhower)
      const system = await prisma.system.upsert({
        where: { id: 1 },
        update: {
          name: 'Eisenhower',
          registrationOpen: true
        },
        create: {
          name: 'Eisenhower',
          registrationOpen: true
        }
      })

      expect(system.name).toBe('Eisenhower')
      expect(system.registrationOpen).toBe(true)

      // 2. Create first User as system admin (random email address)
      const userData = generateTestData.user()
      const user = await prisma.user.create({
        data: userData
      })

      // 3. Make user a system admin
      const adminUser = await prisma.user.update({
        where: { id: user.id },
        data: { isSystemAdmin: true }
      })

      expect(adminUser.isSystemAdmin).toBe(true)

      // 4. Create Person (random name) as User's primary Person
      const primaryPersonData = generateTestData.person(user.id)
      const primaryPerson = await prisma.person.create({
        data: primaryPersonData
      })

      expect(primaryPerson.userId).toBe(user.id)
      expect(primaryPerson.firstName).toBe(primaryPersonData.firstName)
      expect(primaryPerson.lastName).toBe(primaryPersonData.lastName)

      // 5. Create another Person, initially assigned to User
      const secondPersonData = generateTestData.person(user.id)
      const secondPerson = await prisma.person.create({
        data: secondPersonData
      })

      expect(secondPerson.userId).toBe(user.id)

      const suffix = Math.random().toString(36).substring(2, 8)

      // 6. Create Group (school named Eisenhower)
      const school = await createGroupWithParent({
        displayId: 'eisenhower-elementary-' + suffix,
        name: 'Eisenhower Elementary School',
        description: 'A premier elementary school serving the community',
        publiclyVisible: true
      })

      expect(school.name).toBe('Eisenhower Elementary School')
      expect(school.displayId).toBe('eisenhower-elementary-' + suffix)

      // 7. Create sub-groups for each grade
      const kindergarten = await createGroupWithParent({
        displayId: 'eisenhower-kindergarten-' + suffix,
        name: 'Kindergarten',
        parentGroupId: school.id
      })

      const firstGrade = await createGroupWithParent({
        displayId: 'eisenhower-first-grade-' + suffix,
        name: 'First Grade',
        parentGroupId: school.id
      })

      const secondGrade = await createGroupWithParent({
        displayId: 'eisenhower-second-grade-' + suffix,
        name: 'Second Grade',
        parentGroupId: school.id
      })

      expect(kindergarten.parentGroupId).toBe(school.id)
      expect(firstGrade.parentGroupId).toBe(school.id)
      expect(secondGrade.parentGroupId).toBe(school.id)

      // 8. Assign Person to Group (principal of the school)
      const principalMembership = await addPersonToGroup(
        primaryPerson.id,
        school.id, 
        'PRINCIPAL',
        true
      )

      expect(principalMembership.personId).toBe(primaryPerson.id)
      expect(principalMembership.groupId).toBe(school.id)
      expect(principalMembership.relation).toBe('PRINCIPAL')
      expect(principalMembership.isAdmin).toBe(true)

      // 9. Verify all relationships work correctly
      const systemWithAdmins = await findSystemWithAdmins()
      expect(systemWithAdmins).toBeDefined()
      expect(systemWithAdmins?.adminUsers).toBeDefined()
      expect(systemWithAdmins?.adminUsers.length).toBeGreaterThan(0)
      // Find our specific user in the admin list
      const ourAdmin = systemWithAdmins?.adminUsers.find(admin => admin.user.id === user.id)
      expect(ourAdmin).toBeDefined()

      const userWithPeople = await findUserWithPeople(user.id)
      expect(userWithPeople?.people).toHaveLength(2)
      expect(userWithPeople?.isSystemAdmin).toBe(true)

      const schoolWithMembers = await findGroupWithMembers(school.id)
      expect(schoolWithMembers?.people).toHaveLength(1)
      expect(schoolWithMembers!.people[0].person.id).toBe(primaryPerson.id)
      expect(schoolWithMembers?.childGroups).toHaveLength(3)
    })
  })

  describe('Soft Delete Behavior Across All Models', () => {
    it('should handle soft delete consistently across all models', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Create test data
      const system = await prisma.system.upsert({
        where: { id: 1 },
        update: { name: 'Test System', registrationOpen: true },
        create: { name: 'Test System', registrationOpen: true }
      })

      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      const person = await prisma.person.create({
        data: generateTestData.person(user.id)
      })

      const group = await prisma.group.create({
        data: generateTestData.group()
      })

      const contactInfo = await prisma.contactInformation.create({
        data: generateTestData.contactInfo()
      })

      const claim = await prisma.claim.create({
        data: generateTestData.claim(person.id, user.id)
      })

      // Store original IDs
      const originalIds = {
        system: system.id,
        user: user.id,
        person: person.id,
        group: group.id,
        contactInfo: contactInfo.id,
        claim: claim.id
      }

      // Soft delete all records
      await prisma.system.delete({ where: { id: system.id } })
      await prisma.user.delete({ where: { id: user.id } })
      await prisma.person.delete({ where: { id: person.id } })
      await prisma.group.delete({ where: { id: group.id } })
      await prisma.contactInformation.delete({ where: { id: contactInfo.id } })
      await prisma.claim.delete({ where: { id: claim.id } })

      // All should be null when queried normally
      const deletedRecords = await Promise.all([
        prisma.system.findUnique({ where: { id: originalIds.system } }),
        prisma.user.findUnique({ where: { id: originalIds.user } }),
        prisma.person.findUnique({ where: { id: originalIds.person } }),
        prisma.group.findUnique({ where: { id: originalIds.group } }),
        prisma.contactInformation.findUnique({ where: { id: originalIds.contactInfo } }),
        prisma.claim.findUnique({ where: { id: originalIds.claim } })
      ])

      deletedRecords.forEach(record => {
        expect(record).toBeNull()
      })

      // But should exist when explicitly querying for deleted records (using raw SQL to bypass middleware)
      const systemResult = await prisma.$queryRaw`SELECT * FROM systems WHERE id = ${originalIds.system}`
      const userResult = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${originalIds.user}`
      const personResult = await prisma.$queryRaw`SELECT * FROM people WHERE id = ${originalIds.person}`
      const groupResult = await prisma.$queryRaw`SELECT * FROM groups WHERE id = ${originalIds.group}`
      const contactResult = await prisma.$queryRaw`SELECT * FROM contact_information WHERE id = ${originalIds.contactInfo}`
      const claimResult = await prisma.$queryRaw`SELECT * FROM claims WHERE id = ${originalIds.claim}`

      expect((systemResult as any)[0]?.deleted).toBe(true)
      expect((userResult as any)[0]?.deleted).toBe(true)
      expect((personResult as any)[0]?.deleted).toBe(true)
      expect((groupResult as any)[0]?.deleted).toBe(true)
      expect((contactResult as any)[0]?.deleted).toBe(true)
      expect((claimResult as any)[0]?.deleted).toBe(true)
    })

    it('should handle findMany operations with soft delete middleware', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Create multiple records
      const activeUser = await prisma.user.create({ data: generateTestData.user() })
      const deletedUser = await prisma.user.create({ data: generateTestData.user() })

      const activePerson = await prisma.person.create({ data: generateTestData.person(activeUser.id) })
      const deletedPerson = await prisma.person.create({ data: generateTestData.person(deletedUser.id) })

      // Soft delete some records
      await prisma.user.delete({ where: { id: deletedUser.id } })
      await prisma.person.delete({ where: { id: deletedPerson.id } })

      // findMany should only return non-deleted records
      const users = await prisma.user.findMany()
      const people = await prisma.person.findMany()

      // Should include the active user
      const foundActiveUser = users.find(u => u.id === activeUser.id)
      expect(foundActiveUser).toBeDefined()

      // Should include the active person
      const foundActivePerson = people.find(p => p.id === activePerson.id)
      expect(foundActivePerson).toBeDefined()

      // Should not include the deleted user
      const foundDeletedUser = users.find(u => u.id === deletedUser.id)
      expect(foundDeletedUser).toBeUndefined()

      // Should not include the deleted person
      const foundDeletedPerson = people.find(p => p.id === deletedPerson.id)
      expect(foundDeletedPerson).toBeUndefined()

      // But should include deleted when explicitly requested (using raw SQL to bypass middleware)
      const allUsers = await prisma.$queryRaw`SELECT * FROM users WHERE id IN (${activeUser.id}, ${deletedUser.id})`
      const allPeople = await prisma.$queryRaw`SELECT * FROM people WHERE id IN (${activePerson.id}, ${deletedPerson.id})`

      expect((allUsers as any).length).toBe(2)
      expect((allPeople as any).length).toBe(2)
    })
  })

  describe('Contact Information Associations', () => {
    it('should properly associate ContactInformation across all entity types', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Create entities
      const system = await prisma.system.upsert({
        where: { id: 1 },
        update: { name: 'Test System', registrationOpen: true },
        create: { name: 'Test System', registrationOpen: true }
      })

      const user = await prisma.user.create({
        data: generateTestData.user()
      })

      const person = await prisma.person.create({
        data: generateTestData.person(user.id)
      })

      const group = await prisma.group.create({
        data: generateTestData.group()
      })

      // Create contact information entries
      const emailContact = await prisma.contactInformation.create({
        data: {
          type: 'EMAIL',
          label: 'Primary Email',
          value: 'contact@example.com',
          privacy: 'PUBLIC'
        }
      })

      const phoneContact = await prisma.contactInformation.create({
        data: {
          type: 'PHONE',
          label: 'Main Phone',
          value: '+1-555-123-4567',
          privacy: 'PUBLIC'
        }
      })

      const addressContact = await prisma.contactInformation.create({
        data: {
          type: 'ADDRESS',
          label: 'Office Address',
          value: '123 Main St, City, ST 12345',
          privacy: 'PUBLIC'
        }
      })

      // Associate contacts with entities
      await prisma.systemContactInformation.create({
        data: { systemId: system.id, contactInformationId: emailContact.id }
      })

      await prisma.personContactInformation.create({
        data: { personId: person.id, contactInformationId: phoneContact.id }
      })

      await prisma.groupContactInformation.create({
        data: { groupId: group.id, contactInformationId: addressContact.id }
      })

      // Verify associations
      const systemWithContacts = await prisma.system.findUnique({
        where: { id: system.id },
        include: {
          contactInformation: {
            include: { contactInformation: true }
          }
        }
      })

      const personWithContacts = await prisma.person.findUnique({
        where: { id: person.id },
        include: {
          contactInformation: {
            include: { contactInformation: true }
          }
        }
      })

      const groupWithContacts = await prisma.group.findUnique({
        where: { id: group.id },
        include: {
          contactInformation: {
            include: { contactInformation: true }
          }
        }
      })

      expect(systemWithContacts).toBeDefined()
      expect(systemWithContacts?.contactInformation).toHaveLength(1)
      expect(systemWithContacts!.contactInformation[0].contactInformation.value).toBe('contact@example.com')

      expect(personWithContacts?.contactInformation).toHaveLength(1)
      expect(personWithContacts!.contactInformation[0].contactInformation.value).toBe('+1-555-123-4567')

      expect(groupWithContacts?.contactInformation).toHaveLength(1)
      expect(groupWithContacts!.contactInformation[0].contactInformation.value).toBe('123 Main St, City, ST 12345')
    })

    it('should prevent duplicate contact associations', async () => {
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

      const contactInfo = await prisma.contactInformation.create({
        data: generateTestData.contactInfo()
      })

      // Create first association
      await prisma.personContactInformation.create({
        data: { personId: person.id, contactInformationId: contactInfo.id }
      })

      // Attempt duplicate association - should fail due to unique constraint
      await expect(
        prisma.personContactInformation.create({
          data: { personId: person.id, contactInformationId: contactInfo.id }
        })
      ).rejects.toThrow()
    })
  })

  describe('Person Transfer and Claims Integration', () => {
    it('should handle complete person transfer workflow', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Create original user and person with contacts and group memberships
      const originalUser = await prisma.user.create({
        data: generateTestData.user()
      })

      const personWithContact = await createPersonWithContact({
        ...generateTestData.person(originalUser.id),
        contactInfo: {
          type: 'EMAIL',
          label: 'Personal',
          value: 'person@example.com',
          privacy: 'PRIVATE'
        }
      })

      const group = await prisma.group.create({
        data: generateTestData.group()
      })

      await addPersonToGroup(personWithContact.id, group.id, 'MEMBER', false)

      // Create claim and new user
      const claim = await createClaim(personWithContact.id, originalUser.id)
      const newUser = await prisma.user.create({
        data: generateTestData.user()
      })

      // Execute transfer
      await claimPerson(claim.claimCode, newUser.id)

      // Verify person was transferred with all relationships intact
      const transferredPerson = await prisma.person.findUnique({
        where: { id: personWithContact.id },
        include: {
          user: true,
          contactInformation: {
            include: { contactInformation: true }
          },
          groupMemberships: {
            include: { group: true }
          },
          claims: true
        }
      })

      expect(transferredPerson?.userId).toBe(newUser.id)
      expect(transferredPerson?.user?.id).toBe(newUser.id)
      expect(transferredPerson?.contactInformation).toHaveLength(1)
      expect(transferredPerson?.groupMemberships).toHaveLength(1)
      expect(transferredPerson?.claims[0].claimed).toBe(true)

      // Verify original user no longer has the person
      const originalUserCheck = await findUserWithPeople(originalUser.id)
      expect(originalUserCheck?.people).toHaveLength(0)

      // Verify new user now has the person
      const newUserCheck = await findUserWithPeople(newUser.id)
      expect(newUserCheck?.people).toHaveLength(1)
      expect(newUserCheck!.people[0].id).toBe(personWithContact.id)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and optional field combinations', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Test person with user (Person model requires userId)
      const testUser = await prisma.user.create({
        data: generateTestData.user()
      })

      const testPerson = await prisma.person.create({
        data: {
          firstName: 'Test',
          lastName: 'Person',
          displayId: 'test-person-' + Math.random().toString(36).substring(2, 8),
          userId: testUser.id
        }
      })

      expect(testPerson.userId).toBe(testUser.id)

      // Test group without parent
      const rootGroup = await prisma.group.create({
        data: {
          displayId: 'root-group-' + Math.random().toString(36).substring(2, 8),
          name: 'Root Group'
        }
      })

      expect(rootGroup.parentGroupId).toBeNull()

      // Test user without verification token
      const verifiedUser = await prisma.user.create({
        data: {
          email: `verified-${Math.random().toString(36).substring(7)}@example.com`,
          password: 'hashedpassword'
        }
      })

      expect(verifiedUser.verificationToken).toBeNull()
    })

    it('should validate enum constraints', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      // Valid enum values should work
      const validContact = await prisma.contactInformation.create({
        data: {
          type: 'EMAIL',
          label: 'Test',
          value: 'test@example.com',
          privacy: 'PUBLIC'
        }
      })

      expect(validContact.type).toBe('EMAIL')
      expect(validContact.privacy).toBe('PUBLIC')

      // Invalid enum values should fail
      await expect(
        prisma.contactInformation.create({
          data: {
            type: 'INVALID_TYPE',
            label: 'Test',
            value: 'test@example.com',
            privacy: 'PUBLIC'
          } as any
        })
      ).rejects.toThrow()
    })

    it('should handle transaction rollbacks properly', async () => {
      if (!dbAvailable) {
        console.warn('Skipping database test - no test database available')
        expect(true).toBe(true)
        return
      }

      const initialUserCount = await prisma.user.count()

      // Attempt transaction that should fail
      try {
        await prisma.$transaction(async (tx) => {
          await tx.user.create({
            data: generateTestData.user()
          })

          // This should fail due to missing required field
          await tx.person.create({
            data: {
              firstName: 'Test'
              // missing lastName and displayId
            } as any
          })
        })
      } catch (error) {
        // Expected to fail
      }

      // User count should be unchanged due to rollback
      const finalUserCount = await prisma.user.count()
      expect(finalUserCount).toBe(initialUserCount)
    })
  })
})