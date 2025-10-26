import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { prisma } from '../lib/prisma.js';
import { createTestUser, createTestSystemAdmin } from '../utils/test-auth.js';
import { describeIfDatabase } from '../utils/describe-db.js';
import '../test-setup.js';

describeIfDatabase('PersonGroup Authorization', () => {
  let app: any;
  let adminUser: any;
  let regularUser1: any;
  let regularUser2: any;
  let person1: any;
  let person2: any;
  let person3: any;
  let group: any;

  const adminAuth = createTestSystemAdmin({ id: 999 });
  const user1Auth = createTestUser({ id: 1000 });
  const user2Auth = createTestUser({ id: 1001 });

  beforeAll(async () => {
    ({ server: app } = await import('../index.js'));
  });

  beforeEach(async () => {
    // Create test users
    adminUser = await prisma.user.create({
      data: {
        email: `admin-${Math.random().toString(36).substring(2, 8)}@example.com`,
        password: 'hashedpassword',
        isSystemAdmin: true
      }
    });

    regularUser1 = await prisma.user.create({
      data: {
        email: `user1-${Math.random().toString(36).substring(2, 8)}@example.com`,
        password: 'hashedpassword',
        isSystemAdmin: false
      }
    });

    regularUser2 = await prisma.user.create({
      data: {
        email: `user2-${Math.random().toString(36).substring(2, 8)}@example.com`,
        password: 'hashedpassword',
        isSystemAdmin: false
      }
    });

    // Create persons for each user
    person1 = await prisma.person.create({
      data: {
        firstName: 'User1',
        lastName: 'Person',
        displayId: `user1-${Math.random().toString(36).substring(2, 8)}`,
        userId: regularUser1.id
      }
    });

    person2 = await prisma.person.create({
      data: {
        firstName: 'User2',
        lastName: 'Person',
        displayId: `user2-${Math.random().toString(36).substring(2, 8)}`,
        userId: regularUser2.id
      }
    });

    person3 = await prisma.person.create({
      data: {
        firstName: 'User1Second',
        lastName: 'Person',
        displayId: `user1-second-${Math.random().toString(36).substring(2, 8)}`,
        userId: regularUser1.id
      }
    });

    // Create a test group
    group = await prisma.group.create({
      data: {
        displayId: `test-group-${Math.random().toString(36).substring(2, 8)}`,
        name: 'Test Group',
        description: 'Test group for authorization testing'
      }
    });

    // Make person1 an admin of the group
    await prisma.personGroup.create({
      data: {
        personId: person1.id,
        groupId: group.id,
        isAdmin: true
      }
    });
  });

  describe('POST /api/person-groups - Create membership', () => {
    it('should allow system admin to add member to any group', async () => {
      const testAuth = createTestSystemAdmin({ id: adminUser.id });

      const response = await request(app)
        .post('/api/person-groups')
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          personId: person2.id,
          groupId: group.id,
          isAdmin: false
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should allow group admin to add member to their group', async () => {
      const testAuth = createTestUser({ id: regularUser1.id });

      const response = await request(app)
        .post('/api/person-groups')
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          personId: person2.id,
          groupId: group.id,
          isAdmin: false
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should prevent non-admin from adding member to group', async () => {
      const testAuth = createTestUser({ id: regularUser2.id });

      const response = await request(app)
        .post('/api/person-groups')
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          personId: person2.id,
          groupId: group.id,
          isAdmin: false
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Only group administrators can modify');
    });

    it('should prevent non-admin from granting admin privileges', async () => {
      const testAuth = createTestUser({ id: regularUser2.id });

      const response = await request(app)
        .post('/api/person-groups')
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          personId: person2.id,
          groupId: group.id,
          isAdmin: true
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should prevent user from making themselves admin', async () => {
      const testAuth = createTestUser({ id: regularUser1.id });

      const response = await request(app)
        .post('/api/person-groups')
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          personId: person3.id, // person3 also belongs to regularUser1
          groupId: group.id,
          isAdmin: true
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot modify your own admin status');
    });

    it('should allow admin to grant admin to others', async () => {
      const testAuth = createTestUser({ id: regularUser1.id });

      const response = await request(app)
        .post('/api/person-groups')
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          personId: person2.id,
          groupId: group.id,
          isAdmin: true
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAdmin).toBe(true);
    });
  });

  describe('PATCH /api/person-groups/:id - Update membership', () => {
    let membershipId: number;

    beforeEach(async () => {
      // Create a regular membership for person2
      const membership = await prisma.personGroup.create({
        data: {
          personId: person2.id,
          groupId: group.id,
          isAdmin: false
        }
      });
      membershipId = membership.id;
    });

    it('should allow system admin to update any membership', async () => {
      const testAuth = createTestSystemAdmin({ id: adminUser.id });

      const response = await request(app)
        .patch(`/api/person-groups/${membershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          isAdmin: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow group admin to update membership in their group', async () => {
      const testAuth = createTestUser({ id: regularUser1.id });

      const response = await request(app)
        .patch(`/api/person-groups/${membershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          isAdmin: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent non-admin from updating membership', async () => {
      const testAuth = createTestUser({ id: regularUser2.id });

      const response = await request(app)
        .patch(`/api/person-groups/${membershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          isAdmin: true
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should prevent user from making themselves admin via PATCH', async () => {
      // Get person2's membership (person2 belongs to regularUser2)
      const testAuth = createTestUser({ id: regularUser1.id });

      // Create a membership for person3 (which belongs to user1)
      const ownMembership = await prisma.personGroup.create({
        data: {
          personId: person3.id,
          groupId: group.id,
          isAdmin: false
        }
      });

      // Try to make themselves admin
      const response = await request(app)
        .patch(`/api/person-groups/${ownMembership.id}`)
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          isAdmin: true
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot modify your own admin status');
    });
  });

  describe('DELETE /api/person-groups/:id - Remove membership', () => {
    let membershipId: number;

    beforeEach(async () => {
      const membership = await prisma.personGroup.create({
        data: {
          personId: person2.id,
          groupId: group.id,
          isAdmin: false
        }
      });
      membershipId = membership.id;
    });

    it('should allow system admin to delete any membership', async () => {
      const testAuth = createTestSystemAdmin({ id: adminUser.id });

      const response = await request(app)
        .delete(`/api/person-groups/${membershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow group admin to delete membership from their group', async () => {
      const testAuth = createTestUser({ id: regularUser1.id });

      const response = await request(app)
        .delete(`/api/person-groups/${membershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent non-admin from deleting membership', async () => {
      const testAuth = createTestUser({ id: regularUser2.id });

      const response = await request(app)
        .delete(`/api/person-groups/${membershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/person-groups/:id - Full update', () => {
    let membershipId: number;

    beforeEach(async () => {
      const membership = await prisma.personGroup.create({
        data: {
          personId: person2.id,
          groupId: group.id,
          isAdmin: false
        }
      });
      membershipId = membership.id;
    });

    it('should allow group admin to fully update membership', async () => {
      const testAuth = createTestUser({ id: regularUser1.id });

      const response = await request(app)
        .put(`/api/person-groups/${membershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          personId: person2.id,
          groupId: group.id,
          isAdmin: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent non-admin from full update', async () => {
      const testAuth = createTestUser({ id: regularUser2.id });

      const response = await request(app)
        .put(`/api/person-groups/${membershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          personId: person2.id,
          groupId: group.id,
          isAdmin: false
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Last Admin Protection', () => {
    let adminMembershipId: number;

    beforeEach(async () => {
      // Get the admin membership for person1
      const adminMembership = await prisma.personGroup.findFirst({
        where: {
          personId: person1.id,
          groupId: group.id,
          isAdmin: true
        }
      });
      adminMembershipId = adminMembership!.id;
    });

    it('should prevent deleting the last admin', async () => {
      const testAuth = createTestSystemAdmin({ id: adminUser.id });

      const response = await request(app)
        .delete(`/api/person-groups/${adminMembershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot remove the last administrator');
    });

    it('should allow deleting an admin when there are multiple admins', async () => {
      const testAuth = createTestSystemAdmin({ id: adminUser.id });

      // Add another admin first
      const secondAdmin = await prisma.personGroup.create({
        data: {
          personId: person2.id,
          groupId: group.id,
          isAdmin: true
        }
      });

      const response = await request(app)
        .delete(`/api/person-groups/${adminMembershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent removing admin status via PATCH when last admin', async () => {
      const testAuth = createTestSystemAdmin({ id: adminUser.id });

      const response = await request(app)
        .patch(`/api/person-groups/${adminMembershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          isAdmin: false
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot remove the last administrator');
    });

    it('should allow removing admin status via PATCH when there are multiple admins', async () => {
      const testAuth = createTestSystemAdmin({ id: adminUser.id });

      // Add another admin first
      await prisma.personGroup.create({
        data: {
          personId: person2.id,
          groupId: group.id,
          isAdmin: true
        }
      });

      const response = await request(app)
        .patch(`/api/person-groups/${adminMembershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          isAdmin: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent removing admin status via PUT when last admin', async () => {
      const testAuth = createTestSystemAdmin({ id: adminUser.id });

      const response = await request(app)
        .put(`/api/person-groups/${adminMembershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          personId: person1.id,
          groupId: group.id,
          isAdmin: false
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot remove the last administrator');
    });

    it('should allow removing admin status via PUT when there are multiple admins', async () => {
      const testAuth = createTestSystemAdmin({ id: adminUser.id });

      // Add another admin first
      await prisma.personGroup.create({
        data: {
          personId: person2.id,
          groupId: group.id,
          isAdmin: true
        }
      });

      const response = await request(app)
        .put(`/api/person-groups/${adminMembershipId}`)
        .set('X-Test-User', JSON.stringify(testAuth))
        .send({
          personId: person1.id,
          groupId: group.id,
          isAdmin: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
