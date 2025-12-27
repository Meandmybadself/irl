import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import request from 'supertest'
import { prisma } from '../lib/prisma.js'
import { createTestUser } from '../utils/test-auth.js'
import { describeIfDatabase } from '../utils/describe-db.js'
import { updatePersonInterestVector } from '../utils/vector-helpers.js'
import '../test-setup.js'

describeIfDatabase('Person Recommendations API', () => {
  let app: any
  let ownerUserId: number
  let otherUserId: number
  let ownerPersonId: number
  let ownerDisplayId: string
  let otherPersonId: number
  const ownerUser = createTestUser({ isSystemAdmin: false })
  const otherUser = createTestUser({ isSystemAdmin: false })
  const ownerAuthHeader = JSON.stringify(ownerUser)
  const otherAuthHeader = JSON.stringify(otherUser)

  beforeAll(async () => {
    ({ server: app } = await import('../index.js'))
  })

  beforeEach(async () => {
    const ownerUserRecord = await prisma.user.create({
      data: {
        email: `owner-${Math.random().toString(36).substring(2, 8)}@example.com`,
        password: 'hashedpassword',
        isSystemAdmin: false
      }
    })
    ownerUserId = ownerUserRecord.id

    const otherUserRecord = await prisma.user.create({
      data: {
        email: `other-${Math.random().toString(36).substring(2, 8)}@example.com`,
        password: 'hashedpassword',
        isSystemAdmin: false
      }
    })
    otherUserId = otherUserRecord.id

    const ownerPerson = await prisma.person.create({
      data: {
        firstName: 'Owner',
        lastName: 'Person',
        displayId: `owner-person-${Math.random().toString(36).substring(2, 8)}`,
        userId: ownerUserId
      }
    })
    ownerPersonId = ownerPerson.id
    ownerDisplayId = ownerPerson.displayId

    const otherPerson = await prisma.person.create({
      data: {
        firstName: 'Other',
        lastName: 'Person',
        displayId: `other-person-${Math.random().toString(36).substring(2, 8)}`,
        userId: otherUserId
      }
    })
    otherPersonId = otherPerson.id
  })

  describe('GET /api/persons/:displayId/recommendations', () => {
    it('should get recommendations for person with interests', async () => {
      // Create interests
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

      // Set interests for owner person
      await prisma.personInterest.createMany({
        data: [
          { personId: ownerPersonId, interestId: interest1.id, level: 0.8 },
          { personId: ownerPersonId, interestId: interest2.id, level: 0.6 }
        ]
      })
      await updatePersonInterestVector(ownerPersonId)

      // Set similar interests for other person
      await prisma.personInterest.createMany({
        data: [
          { personId: otherPersonId, interestId: interest1.id, level: 0.9 },
          { personId: otherPersonId, interestId: interest2.id, level: 0.7 }
        ]
      })
      await updatePersonInterestVector(otherPersonId)

      const response = await request(app)
        .get(`/api/persons/${ownerDisplayId}/recommendations`)
        .set('X-Test-User', ownerAuthHeader)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
      expect(response.body.data[0].similarity).toBeDefined()
      expect(response.body.data[0].similarity).toBeGreaterThan(0)
    })

    it('should reject when person has no interests', async () => {
      const response = await request(app)
        .get(`/api/persons/${ownerDisplayId}/recommendations`)
        .set('X-Test-User', ownerAuthHeader)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('no interests')
    })

    it('should reject access for non-owner', async () => {
      const interest = await prisma.interest.create({
        data: {
          name: 'Photography',
          category: 'outdoor_hobbies'
        }
      })

      await prisma.personInterest.create({
        data: {
          personId: ownerPersonId,
          interestId: interest.id,
          level: 0.5
        }
      })
      await updatePersonInterestVector(ownerPersonId)

      const response = await request(app)
        .get(`/api/persons/${ownerDisplayId}/recommendations`)
        .set('X-Test-User', otherAuthHeader)

      expect(response.status).toBe(403)
    })

    it('should exclude person themselves from recommendations', async () => {
      const interest = await prisma.interest.create({
        data: {
          name: 'Photography',
          category: 'outdoor_hobbies'
        }
      })

      await prisma.personInterest.create({
        data: {
          personId: ownerPersonId,
          interestId: interest.id,
          level: 0.5
        }
      })
      await updatePersonInterestVector(ownerPersonId)

      const response = await request(app)
        .get(`/api/persons/${ownerDisplayId}/recommendations`)
        .set('X-Test-User', ownerAuthHeader)

      expect(response.status).toBe(200)
      // Should not include owner person in results
      const ownerInResults = response.body.data.find((p: any) => p.id === ownerPersonId)
      expect(ownerInResults).toBeUndefined()
    })
  })
})


