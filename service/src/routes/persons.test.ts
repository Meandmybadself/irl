import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { server } from '../index.js';
import { prisma } from '../lib/prisma.js';
import { createTestUser } from '../utils/test-auth.js';
import '../test-setup.js';

describe('Persons CRUD API', () => {
  let testUserId: number;
  const testUser = createTestUser();
  const authHeader = JSON.stringify(testUser);

  beforeEach(async () => {
    // Create a test user first
    const user = await prisma.user.create({
      data: {
        email: `test-${Math.random().toString(36).substring(2, 8)}@example.com`,
        password: 'hashedpassword',
        isSystemAdmin: false
      }
    });
    testUserId = user.id;
  });

  const getValidPerson = () => ({
    firstName: 'John',
    lastName: 'Doe',
    displayId: `john-doe-${Math.random().toString(36).substring(2, 8)}`,
    pronouns: 'he/him',
    imageURL: 'https://example.com/avatar.jpg'
  });

  describe('POST /api/persons', () => {
    it('should create new person successfully', async () => {

      const validPerson = getValidPerson();
      const response = await request(server)
        .post('/api/persons')
        .set('X-Test-User', authHeader)
        .send({
          ...validPerson,
          userId: testUserId
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(validPerson.firstName);
      expect(response.body.data.lastName).toBe(validPerson.lastName);
      expect(response.body.data.displayId).toBe(validPerson.displayId);
      expect(response.body.data.userId).toBe(testUserId);
      expect(response.body.message).toBe('Person created successfully');
    });

    it('should fail with non-existent user ID', async () => {
      const validPerson = getValidPerson();
      const response = await request(server)
        .post('/api/persons')
        .set('X-Test-User', authHeader)
        .send({
          ...validPerson,
          userId: 99999
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Referenced user does not exist');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(server)
        .post('/api/persons')
        .set('X-Test-User', authHeader)
        .send({ firstName: 'John' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle duplicate displayId constraint', async () => {
      const validPerson = getValidPerson();
      await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      });

      const response = await request(server)
        .post('/api/persons')
        .set('X-Test-User', authHeader)
        .send({
          ...validPerson,
          userId: testUserId
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/persons', () => {
    const validPerson = getValidPerson();
    beforeEach(async () => {
      await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      });
    });

    it('should list all persons with pagination', async () => {
      const response = await request(server)
        .get('/api/persons')
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('GET /api/persons/:id', () => {
    let personId: number;

    beforeEach(async () => {
      const validPerson = getValidPerson();
      const person = await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      });
      personId = person.id;
    });

    it('should get specific person', async () => {
      const validPerson = getValidPerson();
      const response = await request(server)
        .get(`/api/persons/${personId}`)
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(personId);
      expect(response.body.data.firstName).toBe(validPerson.firstName);
    });

    it('should return 404 for non-existent person', async () => {
      const response = await request(server)
        .get('/api/persons/99999')
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/persons/:id', () => {
    let personId: number;

    beforeEach(async () => {
      const validPerson = getValidPerson();
      const person = await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      });
      personId = person.id;
    });

    it('should update entire person', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        displayId: 'jane-smith-456',
        pronouns: 'she/her',
        imageURL: null,
        userId: testUserId
      };

      const response = await request(server)
        .put(`/api/persons/${personId}`)
        .set('X-Test-User', authHeader)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);
    });
  });

  describe('PATCH /api/persons/:id', () => {
    let personId: number;

    beforeEach(async () => {
      const validPerson = getValidPerson();
      const person = await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      });
      personId = person.id;
    });

    it('should partially update person', async () => {
      const validPerson = getValidPerson();
      const response = await request(server)
        .patch(`/api/persons/${personId}`)
        .set('X-Test-User', authHeader)
        .send({ firstName: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Updated Name');
      expect(response.body.data.lastName).toBe(validPerson.lastName); // Should remain unchanged
    });
  });

  describe('DELETE /api/persons/:id', () => {
    let personId: number;

    beforeEach(async () => {
      const validPerson = getValidPerson();
      const person = await prisma.person.create({
        data: {
          ...validPerson,
          userId: testUserId
        }
      });
      personId = person.id;
    });

    it('should soft delete person', async () => {
      const response = await request(server)
        .delete(`/api/persons/${personId}`)
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Person deleted successfully');

      // Verify soft delete (using raw SQL to bypass middleware)
      const deletedPerson = await prisma.$queryRaw`SELECT * FROM people WHERE id = ${personId}`;
      expect((deletedPerson as any)[0]?.deleted).toBe(true);
    });
  });
});