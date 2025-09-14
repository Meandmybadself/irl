import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { server } from '../index.js';
import { prisma } from '../lib/prisma.js';
import { ContactType, PrivacyLevel } from '@irl/shared';
import { createTestUser } from '../utils/test-auth.js';
import '../test-setup.js';

describe('Contact Information CRUD API', () => {
  const validContactInformation = {
    type: ContactType.EMAIL,
    label: 'Personal Email',
    value: 'test@example.com',
    privacy: PrivacyLevel.PUBLIC
  };

  const testUser = createTestUser();
  const authHeader = JSON.stringify(testUser);

  describe('POST /api/contact-information', () => {
    it('should create new contact information successfully', async () => {
      const response = await request(server)
        .post('/api/contact-information')
        .set('X-Test-User', authHeader)
        .send(validContactInformation);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(validContactInformation.type);
      expect(response.body.data.label).toBe(validContactInformation.label);
      expect(response.body.data.value).toBe(validContactInformation.value);
      expect(response.body.data.privacy).toBe(validContactInformation.privacy);
      expect(response.body.message).toBe('Contact information created successfully');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(server)
        .post('/api/contact-information')
        .set('X-Test-User', authHeader)
        .send({ type: ContactType.EMAIL });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should fail with invalid enum values', async () => {
      const response = await request(server)
        .post('/api/contact-information')
        .set('X-Test-User', authHeader)
        .send({
          ...validContactInformation,
          type: 'INVALID_TYPE'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/contact-information', () => {
    beforeEach(async () => {
      await prisma.contactInformation.create({
        data: validContactInformation
      });
    });

    it('should list all contact information with pagination', async () => {
      const response = await request(server)
        .get('/api/contact-information')
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination parameters', async () => {
      const response = await request(server)
        .get('/api/contact-information?page=1&limit=5')
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/contact-information/:id', () => {
    let contactId: number;

    beforeEach(async () => {
      const contact = await prisma.contactInformation.create({
        data: validContactInformation
      });
      contactId = contact.id;
    });

    it('should get specific contact information', async () => {
      const response = await request(server)
        .get(`/api/contact-information/${contactId}`)
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(contactId);
      expect(response.body.data.type).toBe(validContactInformation.type);
    });

    it('should return 404 for non-existent contact information', async () => {
      const response = await request(server)
        .get('/api/contact-information/99999')
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Contact information not found');
    });

    it('should return 400 for invalid ID parameter', async () => {
      const response = await request(server)
        .get('/api/contact-information/invalid')
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/contact-information/:id', () => {
    let contactId: number;

    beforeEach(async () => {
      const contact = await prisma.contactInformation.create({
        data: validContactInformation
      });
      contactId = contact.id;
    });

    it('should update entire contact information', async () => {
      const updateData = {
        type: ContactType.PHONE,
        label: 'Work Phone',
        value: '+1234567890',
        privacy: PrivacyLevel.PRIVATE
      };

      const response = await request(server)
        .put(`/api/contact-information/${contactId}`)
        .set('X-Test-User', authHeader)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(updateData.type);
      expect(response.body.data.label).toBe(updateData.label);
      expect(response.body.message).toBe('Contact information updated successfully');
    });
  });

  describe('PATCH /api/contact-information/:id', () => {
    let contactId: number;

    beforeEach(async () => {
      const contact = await prisma.contactInformation.create({
        data: validContactInformation
      });
      contactId = contact.id;
    });

    it('should partially update contact information', async () => {
      const response = await request(server)
        .patch(`/api/contact-information/${contactId}`)
        .set('X-Test-User', authHeader)
        .send({ label: 'Updated Label' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.label).toBe('Updated Label');
      expect(response.body.data.type).toBe(validContactInformation.type); // Should remain unchanged
    });
  });

  describe('DELETE /api/contact-information/:id', () => {
    let contactId: number;

    beforeEach(async () => {
      const contact = await prisma.contactInformation.create({
        data: validContactInformation
      });
      contactId = contact.id;
    });

    it('should soft delete contact information', async () => {
      const response = await request(server)
        .delete(`/api/contact-information/${contactId}`)
        .set('X-Test-User', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Contact information deleted successfully');

      // Verify soft delete by querying the record directly (bypassing soft delete middleware)
      const deletedContact = await prisma.$queryRaw`
        SELECT * FROM contact_information WHERE id = ${contactId}
      `;
      expect((deletedContact as any)[0]?.deleted).toBe(true);
    });
  });
});