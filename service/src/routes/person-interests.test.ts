import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import request from 'supertest'
import { prisma } from '../lib/prisma.js'
import { createTestUser } from '../utils/test-auth.js'
import { describeIfDatabase } from '../utils/describe-db.js'
import '../test-setup.js'

describeIfDatabase('Person Interests API', () => {
  let app: any
  let ownerUserId: number
  let otherUserId: number
  let ownerPersonId: number
  let ownerDisplayId: string
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

    const person = await prisma.person.create({
      data: {
        firstName: 'Owner',
        lastName: 'Person',
        displayId: `owner-person-${Math.random().toString(36).substring(2, 8)}`,
        userId: ownerUserId
      }
    })
    ownerPersonId = person.id
    ownerDisplayId = person.displayId
  })

  describe('GET /api/persons/:displayId/interests', () => {
    it('should get person interests for owner', async () => {
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
          level: 0.75
        }
      })

      const response = await request(app)
        .get(`/api/persons/${ownerDisplayId}/interests`)
        .set('X-Test-User', ownerAuthHeader)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].level).toBe(0.75)
    })

    it('should reject access for non-owner', async () => {
      const response = await request(app)
        .get(`/api/persons/${ownerDisplayId}/interests`)
        .set('X-Test-User', otherAuthHeader)

      expect(response.status).toBe(403)
    })
  })

  describe('PUT /api/persons/:displayId/interests', () => {
    it('should set person interests for owner', async () => {
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

      const response = await request(app)
        .put(`/api/persons/${ownerDisplayId}/interests`)
        .set('X-Test-User', ownerAuthHeader)
        .send({
          interests: [
            { interestId: interest1.id, level: 0.8 },
            { interestId: interest2.id, level: 0.6 }
          ]
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
    })

    it('should reject invalid interest level', async () => {
      const interest = await prisma.interest.create({
        data: {
          name: 'Photography',
          category: 'outdoor_hobbies'
        }
      })

      const response = await request(app)
        .put(`/api/persons/${ownerDisplayId}/interests`)
        .set('X-Test-User', ownerAuthHeader)
        .send({
          interests: [
            { interestId: interest.id, level: 1.5 } // Invalid: > 1
          ]
        })

      expect(response.status).toBe(400)
    })

    it('should reject invalid interest ID', async () => {
      const response = await request(app)
        .put(`/api/persons/${ownerDisplayId}/interests`)
        .set('X-Test-User', ownerAuthHeader)
        .send({
          interests: [
            { interestId: 99999, level: 0.5 } // Non-existent interest
          ]
        })

      expect(response.status).toBe(400)
    })

    it('should reject access for non-owner', async () => {
      const interest = await prisma.interest.create({
        data: {
          name: 'Photography',
          category: 'outdoor_hobbies'
        }
      })

      const response = await request(app)
        .put(`/api/persons/${ownerDisplayId}/interests`)
        .set('X-Test-User', otherAuthHeader)
        .send({
          interests: [
            { interestId: interest.id, level: 0.5 }
          ]
        })

      expect(response.status).toBe(403)
    })

    it('should clear interests when empty array provided', async () => {
      const interest = await prisma.interest.create({
        data: {
          name: 'Photography',
          category: 'outdoor_hobbies'
        }
      })

      // Set interests first
      await request(app)
        .put(`/api/persons/${ownerDisplayId}/interests`)
        .set('X-Test-User', ownerAuthHeader)
        .send({
          interests: [
            { interestId: interest.id, level: 0.5 }
          ]
        })

      // Clear interests
      const response = await request(app)
        .put(`/api/persons/${ownerDisplayId}/interests`)
        .set('X-Test-User', ownerAuthHeader)
        .send({
          interests: []
        })

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(0)
    })
  })
})


