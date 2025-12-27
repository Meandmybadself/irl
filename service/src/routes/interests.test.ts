import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import request from 'supertest'
import { prisma } from '../lib/prisma.js'
import { createTestUser } from '../utils/test-auth.js'
import { describeIfDatabase } from '../utils/describe-db.js'
import '../test-setup.js'

describeIfDatabase('Interests API', () => {
  let app: any
  let adminUserId: number
  let regularUserId: number
  const adminUser = createTestUser({ isSystemAdmin: true })
  const regularUser = createTestUser({ isSystemAdmin: false })
  const adminAuthHeader = JSON.stringify(adminUser)
  const regularAuthHeader = JSON.stringify(regularUser)

  beforeAll(async () => {
    ({ server: app } = await import('../index.js'))
  })

  beforeEach(async () => {
    const adminUserRecord = await prisma.user.create({
      data: {
        email: `admin-${Math.random().toString(36).substring(2, 8)}@example.com`,
        password: 'hashedpassword',
        isSystemAdmin: true
      }
    })
    adminUserId = adminUserRecord.id

    const regularUserRecord = await prisma.user.create({
      data: {
        email: `user-${Math.random().toString(36).substring(2, 8)}@example.com`,
        password: 'hashedpassword',
        isSystemAdmin: false
      }
    })
    regularUserId = regularUserRecord.id
  })

  describe('GET /api/interests', () => {
    beforeEach(async () => {
      await prisma.interest.createMany({
        data: [
          { name: 'Photography', category: 'outdoor_hobbies' },
          { name: 'Reading', category: 'observation_and_other' },
          { name: 'Cooking', category: 'general_hobbies' }
        ]
      })
    })

    it('should list all interests', async () => {
      const response = await request(app)
        .get('/api/interests')
        .set('X-Test-User', adminAuthHeader)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter interests by category', async () => {
      const response = await request(app)
        .get('/api/interests?category=outdoor_hobbies')
        .set('X-Test-User', adminAuthHeader)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.every((i: any) => i.category === 'outdoor_hobbies')).toBe(true)
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/interests')

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/interests', () => {
    it('should create interest as admin', async () => {
      const response = await request(app)
        .post('/api/interests')
        .set('X-Test-User', adminAuthHeader)
        .send({
          name: 'New Interest',
          category: 'general_hobbies'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('New Interest')
      expect(response.body.data.category).toBe('general_hobbies')
    })

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/api/interests')
        .set('X-Test-User', regularAuthHeader)
        .send({
          name: 'New Interest',
          category: 'general_hobbies'
        })

      expect(response.status).toBe(403)
    })

    it('should reject duplicate name and category', async () => {
      await prisma.interest.create({
        data: {
          name: 'Existing Interest',
          category: 'general_hobbies'
        }
      })

      const response = await request(app)
        .post('/api/interests')
        .set('X-Test-User', adminAuthHeader)
        .send({
          name: 'Existing Interest',
          category: 'general_hobbies'
        })

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/interests/:id', () => {
    it('should soft delete interest as admin', async () => {
      const interest = await prisma.interest.create({
        data: {
          name: 'To Delete',
          category: 'general_hobbies'
        }
      })

      const response = await request(app)
        .delete(`/api/interests/${interest.id}`)
        .set('X-Test-User', adminAuthHeader)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      const deleted = await prisma.interest.findUnique({
        where: { id: interest.id }
      })
      expect(deleted?.deleted).toBe(true)
    })

    it('should reject non-admin users', async () => {
      const interest = await prisma.interest.create({
        data: {
          name: 'To Delete',
          category: 'general_hobbies'
        }
      })

      const response = await request(app)
        .delete(`/api/interests/${interest.id}`)
        .set('X-Test-User', regularAuthHeader)

      expect(response.status).toBe(403)
    })
  })
})

