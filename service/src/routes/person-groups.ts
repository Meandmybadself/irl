import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, validateDisplayIdParam, personGroupSchema, updatePersonGroupSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { canModifyPersonGroup } from '../middleware/authorization.js';
import type { ApiResponse, PaginatedResponse, PersonGroup } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// GET /api/person-groups - List all person-group relationships
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.personGroup.findMany({
      skip,
      take: limit,
      orderBy: { id: 'desc' },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayId: true,
            pronouns: true,
            imageURL: true,
            userId: true,
            createdAt: true,
            updatedAt: true
          }
        },
        group: {
          select: {
            id: true,
            displayId: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    }),
    prisma.personGroup.count()
  ]);

  const response: PaginatedResponse<PersonGroup> = {
    success: true,
    data: items as any,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/person-groups/by-person/:displayId - Get all groups for a person
router.get('/by-person/:displayId', requireAuth, validateDisplayIdParam, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  // First find the person
  const person = await prisma.person.findFirst({
    where: { displayId, deleted: false }
  });

  if (!person) {
    throw createError(404, 'Person not found');
  }

  // Get all person-group relationships for this person
  const items = await prisma.personGroup.findMany({
    where: { personId: person.id },
    include: {
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayId: true,
          pronouns: true,
          imageURL: true,
          userId: true,
          createdAt: true,
          updatedAt: true
        }
      },
      group: {
        select: {
          id: true,
          displayId: true,
          name: true,
          description: true,
          publiclyVisible: true,
          allowsAnyUserToCreateSubgroup: true,
          parentGroupId: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  const response: ApiResponse<PersonGroup[]> = {
    success: true,
    data: items as any
  };

  res.json(response);
}));

// GET /api/person-groups/by-group/:displayId - Get all members for a group
router.get('/by-group/:displayId', requireAuth, validateDisplayIdParam, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  // First find the group
  const group = await prisma.group.findFirst({
    where: { displayId, deleted: false }
  });

  if (!group) {
    throw createError(404, 'Group not found');
  }

  // Get all person-group relationships for this group
  const items = await prisma.personGroup.findMany({
    where: { groupId: group.id },
    include: {
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayId: true,
          pronouns: true,
          imageURL: true,
          userId: true,
          createdAt: true,
          updatedAt: true
        }
      },
      group: {
        select: {
          id: true,
          displayId: true,
          name: true,
          description: true,
          publiclyVisible: true,
          allowsAnyUserToCreateSubgroup: true,
          parentGroupId: true,
          createdAt: true,
          updatedAt: true
        }
      }
    },
    orderBy: { isAdmin: 'desc' } // Admins first
  });

  const response: ApiResponse<PersonGroup[]> = {
    success: true,
    data: items as any
  };

  res.json(response);
}));

// GET /api/person-groups/:id - Get specific person-group relationship
router.get('/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const item = await prisma.personGroup.findUnique({
    where: { id },
    include: {
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayId: true,
          pronouns: true,
          imageURL: true,
          userId: true,
          createdAt: true,
          updatedAt: true
        }
      },
      group: {
        select: {
          id: true,
          displayId: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (!item) {
    throw createError(404, 'Person-group relationship not found');
  }

  const response: ApiResponse<PersonGroup> = {
    success: true,
    data: item as any
  };

  res.json(response);
}));

// POST /api/person-groups - Create new person-group relationship
router.post('/', requireAuth, canModifyPersonGroup, validateBody(personGroupSchema), asyncHandler(async (req, res) => {
  // Check if person exists
  const personExists = await prisma.person.findFirst({
    where: { id: req.body.personId, deleted: false }
  });

  if (!personExists) {
    throw createError(400, 'Referenced person does not exist');
  }

  // Check if group exists
  const groupExists = await prisma.group.findFirst({
    where: { id: req.body.groupId, deleted: false }
  });

  if (!groupExists) {
    throw createError(400, 'Referenced group does not exist');
  }

  const item = await prisma.personGroup.create({
    data: req.body,
    include: {
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayId: true,
          pronouns: true,
          imageURL: true,
          userId: true,
          createdAt: true,
          updatedAt: true
        }
      },
      group: {
        select: {
          id: true,
          displayId: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  const response: ApiResponse<PersonGroup> = {
    success: true,
    data: item as any,
    message: 'Person-group relationship created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/person-groups/:id - Update entire person-group relationship
router.put('/:id', requireAuth, validateIdParam, canModifyPersonGroup, validateBody(personGroupSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Check if person exists
  const personExists = await prisma.person.findFirst({
    where: { id: req.body.personId, deleted: false }
  });

  if (!personExists) {
    throw createError(400, 'Referenced person does not exist');
  }

  // Check if group exists
  const groupExists = await prisma.group.findFirst({
    where: { id: req.body.groupId, deleted: false }
  });

  if (!groupExists) {
    throw createError(400, 'Referenced group does not exist');
  }

  // If removing admin status, check if they're the last admin
  if (req.body.isAdmin === false) {
    const currentPersonGroup = await prisma.personGroup.findUnique({
      where: { id }
    });

    if (currentPersonGroup?.isAdmin) {
      const adminCount = await prisma.personGroup.count({
        where: {
          groupId: currentPersonGroup.groupId,
          isAdmin: true
        }
      });

      if (adminCount <= 1) {
        throw createError(400, 'Cannot remove the last administrator from a group. Please assign another administrator first.');
      }
    }
  }

  const item = await prisma.personGroup.update({
    where: { id },
    data: req.body
  });

  const response: ApiResponse<PersonGroup> = {
    success: true,
    data: item,
    message: 'Person-group relationship updated successfully'
  };

  res.json(response);
}));

// PATCH /api/person-groups/:id - Partial update person-group relationship
router.patch('/:id', requireAuth, validateIdParam, canModifyPersonGroup, validateBody(updatePersonGroupSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Check if person exists (if being updated)
  if (req.body.personId) {
    const personExists = await prisma.person.findFirst({
      where: { id: req.body.personId, deleted: false }
    });

    if (!personExists) {
      throw createError(400, 'Referenced person does not exist');
    }
  }

  // Check if group exists (if being updated)
  if (req.body.groupId) {
    const groupExists = await prisma.group.findFirst({
      where: { id: req.body.groupId, deleted: false }
    });

    if (!groupExists) {
      throw createError(400, 'Referenced group does not exist');
    }
  }

  // If removing admin status, check if they're the last admin
  if (req.body.isAdmin === false) {
    const currentPersonGroup = await prisma.personGroup.findUnique({
      where: { id }
    });

    if (currentPersonGroup?.isAdmin) {
      const adminCount = await prisma.personGroup.count({
        where: {
          groupId: currentPersonGroup.groupId,
          isAdmin: true
        }
      });

      if (adminCount <= 1) {
        throw createError(400, 'Cannot remove the last administrator from a group. Please assign another administrator first.');
      }
    }
  }

  const item = await prisma.personGroup.update({
    where: { id },
    data: req.body
  });

  const response: ApiResponse<PersonGroup> = {
    success: true,
    data: item,
    message: 'Person-group relationship updated successfully'
  };

  res.json(response);
}));

// DELETE /api/person-groups/:id - Delete person-group relationship
router.delete('/:id', requireAuth, validateIdParam, canModifyPersonGroup, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Get the PersonGroup record to check if it's an admin
  const personGroup = await prisma.personGroup.findUnique({
    where: { id }
  });

  if (!personGroup) {
    throw createError(404, 'Person-group relationship not found');
  }

  // If removing an admin, check if they're the last admin
  if (personGroup.isAdmin) {
    const adminCount = await prisma.personGroup.count({
      where: {
        groupId: personGroup.groupId,
        isAdmin: true
      }
    });

    if (adminCount <= 1) {
      throw createError(400, 'Cannot remove the last administrator from a group. Please assign another administrator first.');
    }
  }

  await prisma.personGroup.delete({
    where: { id }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Person-group relationship deleted successfully'
  };

  res.json(response);
}));

export default router;
