import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../lib/prisma.js';
import { createTestUser } from '../utils/test-auth.js';
import '../test-setup.js';
import { describeIfDatabase } from '../utils/describe-db.js';

vi.mock('../lib/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}));

import { sendVerificationEmail } from '../lib/email.js';
const mockedSendVerificationEmail = vi.mocked(sendVerificationEmail);

let app: any;

describeIfDatabase('Users CRUD API', () => {
  const getValidUser = () => ({
    email: `test-${Math.random().toString(36).substring(2, 8)}@example.com`,
    password: 'password123',
    isSystemAdmin: false
  });

  const testUser = createTestUser();
  const authHeader = JSON.stringify(testUser);

  beforeAll(async () => {
    ({ server: app } = await import('../index.js'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/users', () => {
    it('should create new user successfully', async () => {
      const validUser = getValidUser();
      const response = await request(app)
        .post('/api/users')
        .set('X-Test-User', authHeader)
        .send(validUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(validUser.email);
      expect(response.body.data.isSystemAdmin).toBe(true);
      expect(response.body.data.password).toBeUndefined(); // Password should be excluded
      expect(response.body.message).toBe('User created successfully');
      expect(mockedSendVerificationEmail).toHaveBeenCalledWith(validUser.email, expect.any(String));
    });

    it('should fail with invalid email', async () => {
      const validUser = getValidUser();
      const response = await request(app)
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
      const response = await request(app)
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

      const response = await request(app)
        .post('/api/users')
        .set('X-Test-User', authHeader)
        .send(validUser);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Resource already exists with this unique field');
    });

    it('should not promote subsequent users to system admin automatically', async () => {
      const firstUser = getValidUser();
      const secondUser = getValidUser();

      const firstResponse = await request(app)
        .post('/api/users')
        .set('X-Test-User', authHeader)
        .send(firstUser);

      expect(firstResponse.status).toBe(201);
      expect(firstResponse.body.data.isSystemAdmin).toBe(true);

      const secondResponse = await request(app)
        .post('/api/users')
        .set('X-Test-User', authHeader)
        .send(secondUser);

      expect(secondResponse.status).toBe(201);
      expect(secondResponse.body.data.isSystemAdmin).toBe(false);
    });
  });

  describe('GET /api/users/verify', () => {
    it('should verify user with valid token', async () => {
      const verificationToken = 'verify-token-123';
      const validUser = getValidUser();
      const user = await prisma.user.create({
        data: {
          ...validUser,
          password: 'hashedpassword',
          verificationToken
        }
      });

      const response = await request(app)
        .get(`/api/users/verify?token=${verificationToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email verified successfully');
      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data.password).toBeUndefined();

      const refreshedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(refreshedUser?.verificationToken).toBeNull();
    });

    it('should return 400 when token is missing', async () => {
      const response = await request(app)
        .get('/api/users/verify');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 when token is invalid', async () => {
      const response = await request(app)
        .get('/api/users/verify?token=invalid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
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
      const response = await request(app)
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
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.email).toBe(testUserData.email);
      expect(response.body.data.password).toBeUndefined(); // Password should be excluded
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
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

      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('X-Test-User', authHeader)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(updateData.email);
      expect(response.body.data.isSystemAdmin).toBe(true);
      expect(response.body.data.password).toBeUndefined(); // Password should be excluded
      expect(mockedSendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mockedSendVerificationEmail).toHaveBeenCalledWith(updateData.email, expect.any(String));

      const refreshedUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(refreshedUser?.verificationToken).toEqual(expect.any(String));
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
      const response = await request(app)
        .patch(`/api/users/${userId}`)
        .set('X-Test-User', authHeader)
        .send({ isSystemAdmin: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isSystemAdmin).toBe(true);
      expect(response.body.data.email).toBe(testUserData.email); // Should remain unchanged
      expect(mockedSendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should send verification email when email changes', async () => {
      const newEmail = `patched-${Math.random().toString(36).substring(2, 8)}@example.com`;

      const response = await request(app)
        .patch(`/api/users/${userId}`)
        .set('X-Test-User', authHeader)
        .send({ email: newEmail });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(newEmail);
      expect(mockedSendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mockedSendVerificationEmail).toHaveBeenCalledWith(newEmail, expect.any(String));

      const refreshedUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(refreshedUser?.verificationToken).toEqual(expect.any(String));
    });

    it('should complete verification flow after email change', async () => {
      const newEmail = `flow-${Math.random().toString(36).substring(2, 8)}@example.com`;

      const updateResponse = await request(app)
        .patch(`/api/users/${userId}`)
        .set('X-Test-User', authHeader)
        .send({ email: newEmail });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.email).toBe(newEmail);
      expect(mockedSendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mockedSendVerificationEmail).toHaveBeenCalledWith(newEmail, expect.any(String));

      const userAfterUpdate = await prisma.user.findUnique({ where: { id: userId } });
      expect(userAfterUpdate?.verificationToken).toEqual(expect.any(String));

      const verificationToken = userAfterUpdate?.verificationToken as string;
      const verifyResponse = await request(app)
        .get(`/api/users/verify?token=${verificationToken}`);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.message).toBe('Email verified successfully');

      const userAfterVerification = await prisma.user.findUnique({ where: { id: userId } });
      expect(userAfterVerification?.verificationToken).toBeNull();
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
      const response = await request(app)
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
