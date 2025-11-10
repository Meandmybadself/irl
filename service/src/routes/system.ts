import { Router } from 'express';
import type { System as PrismaSystem } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, systemSchema, updateSystemSchema } from '../middleware/validation.js';
import { requireSystemAdmin } from '../middleware/auth.js';
import type { ApiResponse, System, SystemExportData } from '@irl/shared';
import crypto from 'crypto';

const router: ReturnType<typeof Router> = Router();

const SINGLE_SYSTEM_ID = 1;

type PersistedSystem = PrismaSystem;

const formatSystem = ({ id, name, description, registrationOpen, createdAt, updatedAt }: PersistedSystem): System => ({
  id,
  name,
  description,
  registrationOpen,
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt.toISOString()
});

const findActiveSystem = async (): Promise<PersistedSystem | null> => {
  return prisma.system.findFirst({
    where: {
      id: SINGLE_SYSTEM_ID,
      deleted: false
    }
  });
};

// GET /api/system - Retrieve the singleton system configuration
router.get('/', asyncHandler(async (_req, res) => {
  const item = await findActiveSystem();

  if (!item) {
    throw createError(404, 'System not found');
  }

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item)
  };

  res.json(response);
}));

// POST /api/system - Create the singleton system (admin only)
router.post('/', requireSystemAdmin, validateBody(systemSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.system.findUnique({ where: { id: SINGLE_SYSTEM_ID } });

  if (existing && !existing.deleted) {
    throw createError(409, 'System already exists');
  }

  const item = await prisma.system.upsert({
    where: { id: SINGLE_SYSTEM_ID },
    update: { ...req.body, deleted: false },
    create: { id: SINGLE_SYSTEM_ID, ...req.body }
  });

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item),
    message: 'System created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/system - Replace the singleton system (admin only)
router.put('/', requireSystemAdmin, validateBody(systemSchema), asyncHandler(async (req, res) => {
  const item = await prisma.system.upsert({
    where: { id: SINGLE_SYSTEM_ID },
    update: { ...req.body, deleted: false },
    create: { id: SINGLE_SYSTEM_ID, ...req.body }
  });

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item),
    message: 'System updated successfully'
  };

  res.json(response);
}));

// PATCH /api/system - Partially update the singleton system (admin only)
router.patch('/', requireSystemAdmin, validateBody(updateSystemSchema), asyncHandler(async (req, res) => {
  const existing = await findActiveSystem();

  if (!existing) {
    throw createError(404, 'System not found');
  }

  const item = await prisma.system.update({
    where: { id: SINGLE_SYSTEM_ID },
    data: req.body
  });

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item),
    message: 'System updated successfully'
  };

  res.json(response);
}));

// DELETE /api/system - Soft delete the singleton system (admin only)
router.delete('/', requireSystemAdmin, asyncHandler(async (_req, res) => {
  const existing = await findActiveSystem();

  if (!existing) {
    throw createError(404, 'System not found');
  }

  await prisma.system.update({
    where: { id: SINGLE_SYSTEM_ID },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'System deleted successfully'
  };

  res.json(response);
}));

// GET /api/system/export - Export complete system state (admin only)
router.get('/export', requireSystemAdmin, asyncHandler(async (_req, res) => {
  const [
    system,
    users,
    persons,
    groups,
    contactInformations,
    systemContactInformations,
    personContactInformations,
    groupContactInformations,
    personGroups
  ] = await Promise.all([
    prisma.system.findFirst({ where: { id: SINGLE_SYSTEM_ID, deleted: false } }),
    prisma.user.findMany({ where: { deleted: false } }),
    prisma.person.findMany({ where: { deleted: false } }),
    prisma.group.findMany({ where: { deleted: false } }),
    prisma.contactInformation.findMany({ where: { deleted: false } }),
    prisma.systemContactInformation.findMany(),
    prisma.personContactInformation.findMany(),
    prisma.groupContactInformation.findMany(),
    prisma.personGroup.findMany()
  ]);

  const exportData: SystemExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    system: system ? formatSystem(system) : null,
    users: users.map(({ id, email, isSystemAdmin, createdAt, updatedAt }) => ({
      id,
      email,
      isSystemAdmin,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    })),
    persons: persons.map(p => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      displayId: p.displayId,
      pronouns: p.pronouns,
      imageURL: p.imageURL,
      userId: p.userId,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    })),
    groups: groups.map(g => ({
      id: g.id,
      displayId: g.displayId,
      name: g.name,
      description: g.description,
      parentGroupId: g.parentGroupId,
      allowsAnyUserToCreateSubgroup: g.allowsAnyUserToCreateSubgroup,
      publiclyVisible: g.publiclyVisible,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString()
    })),
    contactInformations: contactInformations.map(c => ({
      id: c.id,
      type: c.type,
      label: c.label,
      value: c.value,
      privacy: c.privacy,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString()
    })),
    systemContactInformations: systemContactInformations.map(sc => ({
      id: sc.id,
      systemId: sc.systemId,
      contactInformationId: sc.contactInformationId
    })),
    personContactInformations: personContactInformations.map(pc => ({
      id: pc.id,
      personId: pc.personId,
      contactInformationId: pc.contactInformationId
    })),
    groupContactInformations: groupContactInformations.map(gc => ({
      id: gc.id,
      groupId: gc.groupId,
      contactInformationId: gc.contactInformationId
    })),
    personGroups: personGroups.map(pg => ({
      id: pg.id,
      personId: pg.personId,
      groupId: pg.groupId,
      isAdmin: pg.isAdmin
    }))
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  res.setHeader('Content-Disposition', `attachment; filename="system-export-${timestamp}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(exportData);
}));

// POST /api/system/import - Import complete system state (admin only)
router.post('/import', requireSystemAdmin, asyncHandler(async (req, res) => {
  const importData = req.body as SystemExportData;

  // Basic validation
  if (!importData || typeof importData !== 'object') {
    throw createError(400, 'Invalid import data');
  }

  if (!importData.version || !importData.exportedAt) {
    throw createError(400, 'Missing required import metadata');
  }

  // Perform import in a transaction
  await prisma.$transaction(async (tx) => {
    // Step 1: Delete existing data in correct order (respecting foreign keys)
    await tx.personGroup.deleteMany({});
    await tx.groupContactInformation.deleteMany({});
    await tx.personContactInformation.deleteMany({});
    await tx.systemContactInformation.deleteMany({});
    await tx.groupInvite.deleteMany({});
    await tx.claim.deleteMany({});
    await tx.group.deleteMany({});
    await tx.person.deleteMany({});
    await tx.contactInformation.deleteMany({});
    await tx.emailChangeRequest.deleteMany({});
    await tx.user.deleteMany({});
    await tx.system.deleteMany({});

    // Step 2: Import system
    if (importData.system) {
      await tx.system.create({
        data: {
          id: importData.system.id,
          name: importData.system.name,
          description: importData.system.description,
          registrationOpen: importData.system.registrationOpen,
          deleted: false
        }
      });
    }

    // Step 3: Import users (generate random passwords)
    for (const user of importData.users) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      await tx.user.create({
        data: {
          id: user.id,
          email: user.email,
          password: randomPassword, // Users will need to reset password
          isSystemAdmin: user.isSystemAdmin,
          verificationToken: null,
          deleted: false
        }
      });
    }

    // Step 4: Import contact informations
    for (const contact of importData.contactInformations) {
      await tx.contactInformation.create({
        data: {
          id: contact.id,
          type: contact.type,
          label: contact.label,
          value: contact.value,
          privacy: contact.privacy,
          deleted: false
        }
      });
    }

    // Step 5: Import persons
    for (const person of importData.persons) {
      await tx.person.create({
        data: {
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          displayId: person.displayId,
          pronouns: person.pronouns,
          imageURL: person.imageURL,
          userId: person.userId,
          deleted: false
        }
      });
    }

    // Step 6: Import groups
    for (const group of importData.groups) {
      await tx.group.create({
        data: {
          id: group.id,
          displayId: group.displayId,
          name: group.name,
          description: group.description,
          parentGroupId: group.parentGroupId,
          allowsAnyUserToCreateSubgroup: group.allowsAnyUserToCreateSubgroup,
          publiclyVisible: group.publiclyVisible,
          deleted: false
        }
      });
    }

    // Step 7: Import junction tables
    for (const sc of importData.systemContactInformations) {
      await tx.systemContactInformation.create({
        data: {
          id: sc.id,
          systemId: sc.systemId,
          contactInformationId: sc.contactInformationId
        }
      });
    }

    for (const pc of importData.personContactInformations) {
      await tx.personContactInformation.create({
        data: {
          id: pc.id,
          personId: pc.personId,
          contactInformationId: pc.contactInformationId
        }
      });
    }

    for (const gc of importData.groupContactInformations) {
      await tx.groupContactInformation.create({
        data: {
          id: gc.id,
          groupId: gc.groupId,
          contactInformationId: gc.contactInformationId
        }
      });
    }

    for (const pg of importData.personGroups) {
      await tx.personGroup.create({
        data: {
          id: pg.id,
          personId: pg.personId,
          groupId: pg.groupId,
          isAdmin: pg.isAdmin
        }
      });
    }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'System imported successfully. All users will need to reset their passwords.'
  };

  res.json(response);
}));

export default router;
