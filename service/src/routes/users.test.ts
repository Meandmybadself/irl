import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { server } from '../index.js';
import { prisma } from '../lib/prisma.js';
import { createTestUser } from '../utils/test-auth.js';
import '../test-setup.js';

describe('Users CRUD API', () => {
  const getValidUser = () => ({
    email: `test-${Math.random().toString(36).substring(2, 8)}@example.com`,
    password: 'password123',
    isSystemAdmin: false
  });

  const testUser = createTestUser();
  const authHeader = JSON.stringify(testUser);

  describe('POST /api/users', () => {
    it('should create new user successfully', async () => {
      const validUser = getValidUser();
      const response = await request(server)
        .post('/api/users')
        .set('X-Test-User', authHeader)
        .send(validUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(validUser.email);
      expect(response.body.data.isSystemAdmin).toBe(false);
      expect(response.body.data.password).toBeUndefined(); // Password should be excluded
      expect(response.body.message).toBe('User created successfully');
    });

    it('should fail with invalid email', async () => {
      const validUser = getValidUser();
      const response = await request(server)
        .post('/api/users')
        .set('X-Test-User', authHeader)
        .send({
          ...validUser,
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should fail with short password', async () => {
      const validUser = getValidUser();
      const response = await request(server)
        .post('/api/users')
        .set('X-Test-User', authHeader)
        .send({
          ...validUser,
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle duplicate email constraint', async () => {
      const validUser = getValidUser();
      await prisma.user.create({
        data: {
          ...validUser,
          password: 'hashedpassword'
        }
      });

      const response = await request(server)
        .post('/api/users')
        .set('X-Test-User', authHeader)
        .send(validUser);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Resource already exists with this unique field');
    });
  });

  describe('GET /api/users', () => {
    beforeEach(async () => {
      const validUser = getValidUser();
      await prisma.user.create({
        data: {
          ...validUser,
          password: 'hashedpassword'
        }
      });
    });

    it('should list all users with pagination', async () => {
      const response = await request(server)
        .get('/api/users')
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0].password).toBeUndefined(); // Password should be excluded
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/users/:id', () => {
    let userId: number;
    let testUserData: any;

    beforeEach(async () => {
      testUserData = getValidUser();
      const user = await prisma.user.create({
        data: {
          ...testUserData,
          password: 'hashedpassword'
        }
      });
      userId = user.id;
    });

    it('should get specific user', async () => {
      const response = await request(server)
        .get(`/api/users/${userId}`)
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.email).toBe(testUserData.email);
      expect(response.body.data.password).toBeUndefined(); // Password should be excluded
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(server)
        .get('/api/users/99999')
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id', () => {
    let userId: number;
    let testUserData: any;

    beforeEach(async () => {
      testUserData = getValidUser();
      const user = await prisma.user.create({
        data: {
          ...testUserData,
          password: 'hashedpassword'
        }
      });
      userId = user.id;
    });

    it('should update entire user', async () => {
      const updateData = {
        email: `updated-${Math.random().toString(36).substring(2, 8)}@example.com`,
        password: 'newpassword123',
        isSystemAdmin: true
      };

      const response = await request(server)
        .put(`/api/users/${userId}`)
        .set('X-Test-User', authHeader)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(updateData.email);
      expect(response.body.data.isSystemAdmin).toBe(true);
      expect(response.body.data.password).toBeUndefined(); // Password should be excluded
    });
  });

  describe('PATCH /api/users/:id', () => {
    let userId: number;
    let testUserData: any;

    beforeEach(async () => {
      testUserData = getValidUser();
      const user = await prisma.user.create({
        data: {
          ...testUserData,
          password: 'hashedpassword'
        }
      });
      userId = user.id;
    });

    it('should partially update user', async () => {
      const response = await request(server)
        .patch(`/api/users/${userId}`)
        .set('X-Test-User', authHeader)
        .send({ isSystemAdmin: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isSystemAdmin).toBe(true);
      expect(response.body.data.email).toBe(testUserData.email); // Should remain unchanged
    });
  });

  describe('DELETE /api/users/:id', () => {
    let userId: number;

    beforeEach(async () => {
      const testUserData = getValidUser();
      const user = await prisma.user.create({
        data: {
          ...testUserData,
          password: 'hashedpassword'
        }
      });
      userId = user.id;
    });

    it('should soft delete user', async () => {
      const response = await request(server)
        .delete(`/api/users/${userId}`)
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify soft delete - use findMany to bypass middleware deleted filter
      const deletedUsers = await prisma.user.findMany({
        where: { id: userId, deleted: true }
      });
      expect(deletedUsers).toHaveLength(1);
      expect(deletedUsers[0].deleted).toBe(true);
    });
  });
});