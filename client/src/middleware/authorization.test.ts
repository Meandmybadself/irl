import { describe, it, expect } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { describeIfDatabase } from '../utils/describe-db.js';
import { canViewPersonGroups } from './authorization.js';
import '../test-setup.js';

const createUser = (overrides: Partial<{ isSystemAdmin: boolean }> = {}) =>
  prisma.user.create({
    data: {
      email: `test-${Math.random().toString(36).slice(2, 8)}@example.com`,
      password: 'hashed-password',
      isSystemAdmin: overrides.isSystemAdmin ?? false
    }
  });

const createPerson = (userId: number) =>
  prisma.person.create({
    data: {
      firstName: 'Test',
      lastName: 'User',
      displayId: `person-${Math.random().toString(36).slice(2, 8)}`,
      userId
    }
  });

const createGroup = () =>
  prisma.group.create({
    data: {
      name: 'Test Group',
      displayId: `group-${Math.random().toString(36).slice(2, 8)}`
    }
  });

describeIfDatabase('canViewPersonGroups', () => {
  it('grants full access to system administrators', async () => {
    const admin = await createUser({ isSystemAdmin: true });
    const otherUser = await createUser();
    const targetPerson = await createPerson(otherUser.id);

    const result = await canViewPersonGroups(admin.id, targetPerson.id);

    expect(result.canViewAll).toBe(true);
    expect(result.adminGroupIds.size).toBe(0);
  });

  it('grants full access to the owner of the person record', async () => {
    const owner = await createUser();
    const targetPerson = await createPerson(owner.id);

    const result = await canViewPersonGroups(owner.id, targetPerson.id);

    expect(result.canViewAll).toBe(true);
    expect(result.adminGroupIds.size).toBe(0);
  });

  it('limits non-owners to public or admin groups', async () => {
    const viewer = await createUser();
    const owner = await createUser();
    const targetPerson = await createPerson(owner.id);

    const result = await canViewPersonGroups(viewer.id, targetPerson.id);

    expect(result.canViewAll).toBe(false);
    expect(result.adminGroupIds.size).toBe(0);
  });

  it('includes administered groups for non-owners', async () => {
    const viewer = await createUser();
    const owner = await createUser();
    const targetPerson = await createPerson(owner.id);
    const adminPerson = await createPerson(viewer.id);
    const group = await createGroup();

    await prisma.personGroup.create({
      data: {
        personId: adminPerson.id,
        groupId: group.id,
        isAdmin: true
      }
    });

    const result = await canViewPersonGroups(viewer.id, targetPerson.id);

    expect(result.canViewAll).toBe(false);
    expect(result.adminGroupIds.has(group.id)).toBe(true);
  });
});
