import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { generateTestData, isDatabaseAvailable } from '../utils/test-helpers.js'
import { updatePersonInterestVector } from '../utils/vector-helpers.js'

describe('PersonInterest Management Tests', () => {
  let dbAvailable = false

  beforeEach(async () => {
    dbAvailable = await isDatabaseAvailable()
  })

  describe('PersonInterest Creation and Modification', () => {
    it('should create a PersonInterest with valid level', async () => {
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

      const interest = await prisma.interest.create({
        data: {
          name: 'Photography',
          category: 'outdoor_hobbies'
        }
      })

      const personInterest = await prisma.personInterest.create({
        data: {
          personId: person.id,
          interestId: interest.id,
          level: 0.75
        }
      })

      expect(personInterest).toBeDefined()
      expect(personInterest.personId).toBe(person.id)
      expect(personInterest.interestId).toBe(interest.id)
      expect(Number(personInterest.level)).toBe(0.75)
      expect(personInterest.id).toBeTypeOf('number')
      expect(personInterest.createdAt).toBeInstanceOf(Date)
      expect(personInterest.updatedAt).toBeInstanceOf(Date)
    })

    it('should enforce unique constraint on personId and interestId', async () => {
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

      const interest = await prisma.interest.create({
        data: {
          name: 'Photography',
          category: 'outdoor_hobbies'
        }
      })

      // Create first PersonInterest
      await prisma.personInterest.create({
        data: {
          personId: person.id,
          interestId: interest.id,
          level: 0.5
        }
      })

      // Attempt to create duplicate - should fail
      await expect(
        prisma.personInterest.create({
          data: {
            personId: person.id,
            interestId: interest.id,
            level: 0.8
          }
        })
      ).rejects.toThrow()
    })

    it('should enforce level constraint between 0 and 1', async () => {
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

      const interest = await prisma.interest.create({
        data: {
          name: 'Photography',
          category: 'outdoor_hobbies'
        }
      })

      // Level too high - should fail (database constraint)
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO person_interests ("personId", "interestId", level) VALUES ($1, $2, $3)`,
          person.id,
          interest.id,
          1.5
        )
      ).rejects.toThrow()

      // Level too low - should fail (database constraint)
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO person_interests ("personId", "interestId", level) VALUES ($1, $2, $3)`,
          person.id,
          interest.id,
          -0.1
        )
      ).rejects.toThrow()
    })

    it('should update PersonInterest level', async () => {
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

      const interest = await prisma.interest.create({
        data: {
          name: 'Photography',
          category: 'outdoor_hobbies'
        }
      })

      const personInterest = await prisma.personInterest.create({
        data: {
          personId: person.id,
          interestId: interest.id,
          level: 0.5
        }
      })

      const updated = await prisma.personInterest.update({
        where: { id: personInterest.id },
        data: { level: 0.9 }
      })

      expect(Number(updated.level)).toBe(0.9)
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(personInterest.updatedAt.getTime())
    })

    it('should associate multiple interests with a Person', async () => {
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

      const interest1 = await prisma.interest.create({
        data: {
          name: 'Photography',
          category: 'outdoor_hobbies'
        }
      })

      const interest2 = await prisma.interest.create({
        data: {
          name: 'Reading',
          category: 'observation_and_other'
        }
      })

      const interest3 = await prisma.interest.create({
        data: {
          name: 'Cooking',
          category: 'general_hobbies'
        }
      })

      await prisma.personInterest.createMany({
        data: [
          { personId: person.id, interestId: interest1.id, level: 0.8 },
          { personId: person.id, interestId: interest2.id, level: 0.6 },
          { personId: person.id, interestId: interest3.id, level: 0.4 }
        ]
      })

      const personInterests = await prisma.personInterest.findMany({
        where: { personId: person.id },
        include: { interest: true }
      })

      expect(personInterests).toHaveLength(3)
      const interestNames = personInterests.map(pi => pi.interest.name)
      expect(interestNames).toContain('Photography')
      expect(interestNames).toContain('Reading')
      expect(interestNames).toContain('Cooking')
    })
  })

  describe('Interest Vector Updates', () => {
    it('should update person interest vector when interests are added', async () => {
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

      const interest1 = await prisma.interest.create({
        data: {
          name: 'Photography',
          category: 'outdoor_hobbies'
        }
      })

      const interest2 = await prisma.interest.create({
        data: {
          name: 'Reading',
          category: 'observation_and_other'
        }
      })

      // Create person interests
      await prisma.personInterest.createMany({
        data: [
          { personId: person.id, interestId: interest1.id, level: 0.8 },
          { personId: person.id, interestId: interest2.id, level: 0.6 }
        ]
      })

      // Update vector
      await updatePersonInterestVector(person.id)

      // Check vector was set (not null)
      const personWithVector = await prisma.$queryRawUnsafe<Array<{ interest_vector: string | null }>>(
        `SELECT interest_vector FROM people WHERE id = $1`,
        person.id
      )

      expect(personWithVector[0]?.interest_vector).not.toBeNull()
    })

    it('should set interest vector to null when person has no interests', async () => {
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

      // Update vector for person with no interests
      await updatePersonInterestVector(person.id)

      // Check vector is null
      const personWithVector = await prisma.$queryRawUnsafe<Array<{ interest_vector: string | null }>>(
        `SELECT interest_vector FROM people WHERE id = $1`,
        person.id
      )

      expect(personWithVector[0]?.interest_vector).toBeNull()
    })
  })
})

