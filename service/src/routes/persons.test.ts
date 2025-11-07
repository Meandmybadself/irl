import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import request from 'supertest'
import { prisma } from '../lib/prisma.js'
import { createTestUser } from '../utils/test-auth.js'
import { describeIfDatabase } from '../utils/describe-db.js'
import '../test-setup.js'

const getValidPerson = () => ({
  firstName: 'John',
  lastName: 'Doe',
  displayId: `john-doe-${Math.random().toString(36).substring(2, 8)}`,
  pronouns: 'he/him',
  imageURL: 'https://example.com/avatar.jpg'
})

describeIfDatabase('Persons CRUD API', () => {
  let app: any
  let testUserId: number
  const testUser = createTestUser()
  const authHeader = JSON.stringify(testUser)

  beforeAll(async () => {
    ({ server: app } = await import('../index.js'))
  })

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-${Math.random().toString(36).substring(2, 8)}@example.com`,
        password: 'hashedpassword',
        isSystemAdmin: false
      }
    })
    testUserId = user.id
  })

  describe('POST /api/persons', () => {
    it('should create new person successfully', async () => {
      const validPerson = getValidPerson()
      const response = await request(app)
        .post('/api/persons')
        .set('X-Test-User', authHeader)
        .send({
          ...validPerson,
          userId: testUserId
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.firstName).toBe(validPerson.firstName)
      expect(response.body.data.lastName).toBe(validPerson.lastName)
      expect(response.body.data.displayId).toBe(validPerson.displayId)
      expect(response.body.data.userId).toBe(testUserId)
      expect(response.body.message).toBe('Person created successfully')
    })

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/persons')
        .set('X-Test-User', authHeader)
        .send({ firstName: 'John' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('should handle duplicate displayId constraint', async () => {
      const validPerson = getValidPerson()
      await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      })

      const response = await request(app)
        .post('/api/persons')
        .set('X-Test-User', authHeader)
        .send({
          ...validPerson,
          userId: testUserId
        })

      expect(response.status).toBe(409)
      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/persons', () => {
    beforeEach(async () => {
      const validPerson = getValidPerson()
      await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      })
    })

    it('should list all persons with pagination', async () => {
      const response = await request(app)
        .get('/api/persons')
        .set('X-Test-User', authHeader)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.pagination).toBeDefined()
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(1)
    })
  })

  describe('GET /api/persons/:displayId', () => {
    let personDisplayId: string

    beforeEach(async () => {
      const validPerson = getValidPerson()
      const person = await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      })
      personDisplayId = person.displayId
    })

    it('should get specific person', async () => {
      const response = await request(app)
        .get(`/api/persons/${personDisplayId}`)
        .set('X-Test-User', authHeader)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.displayId).toBe(personDisplayId)
    })

    it('should return 404 for non-existent person', async () => {
      const response = await request(app)
        .get('/api/persons/non-existent-display-id')
        .set('X-Test-User', authHeader)

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })
  })

  describe('PUT /api/persons/:displayId', () => {
    let personDisplayId: string

    beforeEach(async () => {
      const validPerson = getValidPerson()
      const person = await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      })
      personDisplayId = person.displayId
    })

    it('should update entire person', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        displayId: personDisplayId,
        pronouns: 'she/her',
        imageURL: null,
        userId: testUserId
      }

      const response = await request(app)
        .put(`/api/persons/${personDisplayId}`)
        .set('X-Test-User', authHeader)
        .send(updateData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.firstName).toBe(updateData.firstName)
      expect(response.body.data.lastName).toBe(updateData.lastName)
    })
  })

  describe('PATCH /api/persons/:displayId', () => {
    let personDisplayId: string
    let personLastName: string

    beforeEach(async () => {
      const validPerson = getValidPerson()
      const person = await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      })
      personDisplayId = person.displayId
      personLastName = person.lastName
    })

    it('should partially update person', async () => {
      const response = await request(app)
        .patch(`/api/persons/${personDisplayId}`)
        .set('X-Test-User', authHeader)
        .send({ firstName: 'Updated Name' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.firstName).toBe('Updated Name')
      expect(response.body.data.lastName).toBe(personLastName)
    })
  })

  describe('DELETE /api/persons/:displayId', () => {
    let personDisplayId: string
    let personId: number

    beforeEach(async () => {
      const validPerson = getValidPerson()
      const person = await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      })
      personDisplayId = person.displayId
      personId = person.id
    })

    it('should soft delete person', async () => {
      const response = await request(app)
        .delete(`/api/persons/${personDisplayId}`)
        .set('X-Test-User', authHeader)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Person deleted successfully')

      const deletedPerson = await prisma.$queryRaw`SELECT * FROM people WHERE id = ${personId}`
      expect((deletedPerson as any)[0]?.deleted).toBe(true)
    })
  })

  describe('POST /api/persons/bulk', () => {
    it('should create multiple persons successfully for current user', async () => {
      const persons = [
        {
          ...getValidPerson(),
          userId: testUserId
        },
        {
          ...getValidPerson(),
          userId: testUserId
        },
        {
          ...getValidPerson(),
          userId: testUserId
        }
      ]

      const response = await request(app)
        .post('/api/persons/bulk')
        .set('X-Test-User', authHeader)
        .send({ persons })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(3)
      expect(response.body.message).toBe('3 persons created successfully')
      expect(response.body.data[0].userId).toBe(testUserId)
      expect(response.body.data[1].userId).toBe(testUserId)
      expect(response.body.data[2].userId).toBe(testUserId)
    })

    it('should reject bulk creation when non-admin tries to create persons for another user', async () => {
      const otherUserId = testUserId + 999

      const persons = [
        {
          ...getValidPerson(),
          userId: testUserId // correct user
        },
        {
          ...getValidPerson(),
          userId: otherUserId // wrong user!
        }
      ]

      const response = await request(app)
        .post('/api/persons/bulk')
        .set('X-Test-User', authHeader)
        .send({ persons })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Forbidden: You can only create persons for yourself')
    })

    it('should allow system admin to create persons for other users', async () => {
      const adminUser = createTestUser({ isSystemAdmin: true })
      const adminAuthHeader = JSON.stringify(adminUser)
      
      // Create another user in the database
      const otherUser = await prisma.user.create({
        data: {
          email: `other-${Math.random().toString(36).substring(2, 8)}@example.com`,
          password: 'hashedpassword',
          isSystemAdmin: false
        }
      })

      const persons = [
        {
          ...getValidPerson(),
          userId: testUserId
        },
        {
          ...getValidPerson(),
          userId: otherUser.id
        }
      ]

      const response = await request(app)
        .post('/api/persons/bulk')
        .set('X-Test-User', adminAuthHeader)
        .send({ persons })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.data[0].userId).toBe(testUserId)
      expect(response.body.data[1].userId).toBe(otherUser.id)
    })

    it('should reject empty persons array', async () => {
      const response = await request(app)
        .post('/api/persons/bulk')
        .set('X-Test-User', authHeader)
        .send({ persons: [] })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('persons array is required')
    })

    it('should reject when persons field is not an array', async () => {
      const response = await request(app)
        .post('/api/persons/bulk')
        .set('X-Test-User', authHeader)
        .send({ persons: 'not-an-array' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('should detect duplicate displayIds within the batch', async () => {
      const duplicateDisplayId = `duplicate-${Math.random().toString(36).substring(2, 8)}`
      
      const persons = [
        {
          firstName: 'John',
          lastName: 'Doe',
          displayId: duplicateDisplayId,
          userId: testUserId
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          displayId: duplicateDisplayId, // duplicate!
          userId: testUserId
        }
      ]

      const response = await request(app)
        .post('/api/persons/bulk')
        .set('X-Test-User', authHeader)
        .send({ persons })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Duplicate displayIds')
      expect(response.body.error).toContain(duplicateDisplayId)
    })

    it('should detect existing displayIds in database', async () => {
      const existingPerson = getValidPerson()
      await prisma.person.create({
        data: {
          ...existingPerson,
          userId: testUserId
        }
      })

      const persons = [
        {
          ...getValidPerson(),
          userId: testUserId
        },
        {
          ...existingPerson, // already exists!
          userId: testUserId
        }
      ]

      const response = await request(app)
        .post('/api/persons/bulk')
        .set('X-Test-User', authHeader)
        .send({ persons })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('already exist')
      expect(response.body.error).toContain(existingPerson.displayId)
    })

    it('should reject persons with validation errors', async () => {
      const persons = [
        {
          ...getValidPerson(),
          userId: testUserId
        },
        {
          firstName: '', // invalid: empty first name
          lastName: 'Doe',
          displayId: `invalid-${Math.random().toString(36).substring(2, 8)}`,
          userId: testUserId
        }
      ]

      const response = await request(app)
        .post('/api/persons/bulk')
        .set('X-Test-User', authHeader)
        .send({ persons })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Validation errors')
    })

    it('should create all persons in a transaction (all or nothing)', async () => {
      const validDisplayId = `valid-${Math.random().toString(36).substring(2, 8)}`
      const invalidDisplayId = `invalid-${Math.random().toString(36).substring(2, 8)}`

      // First, create a person with the "invalid" displayId
      await prisma.person.create({
        data: {
          firstName: 'Existing',
          lastName: 'Person',
          displayId: invalidDisplayId,
          userId: testUserId
        }
      })

      const persons = [
        {
          firstName: 'Valid',
          lastName: 'Person',
          displayId: validDisplayId,
          userId: testUserId
        },
        {
          firstName: 'Invalid',
          lastName: 'Person',
          displayId: invalidDisplayId, // this exists, should fail entire batch
          userId: testUserId
        }
      ]

      const response = await request(app)
        .post('/api/persons/bulk')
        .set('X-Test-User', authHeader)
        .send({ persons })

      expect(response.status).toBe(400)
      
      // Verify the valid person was NOT created (transaction rolled back)
      const notCreated = await prisma.person.findFirst({
        where: { displayId: validDisplayId }
      })
      expect(notCreated).toBeNull()
    })
  })
})
