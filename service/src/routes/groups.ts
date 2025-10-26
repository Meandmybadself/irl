import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateDisplayIdParam, validateSearchQuery, groupSchema, updateGroupSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { canModifyGroup, canCreateGroup } from '../middleware/authorization.js';
import { getUserFirstPerson } from '../utils/prisma-helpers.js';
import type { ApiResponse, PaginatedResponse, Group } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to format group response
const formatGroup = (group: any): Group => {
  const { deleted, ...groupWithoutDeleted } = group;
  void deleted;
  return {
    ...groupWithoutDeleted,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString()
  };
};

// Helper to check for circular parent group references
const checkCircularReference = async (groupId: number, newParentId: number): Promise<boolean> => {
  let currentParentId: number | null = newParentId;
  const visited = new Set<number>([groupId]);

  while (currentParentId !== null) {
    if (visited.has(currentParentId)) {
      return true; // Circular reference detected
    }

    visited.add(currentParentId);

    const parentGroup: { parentGroupId: number | null } | null = await prisma.group.findFirst({
      where: { id: currentParentId, deleted: false },
      select: { parentGroupId: true }
    });

    if (!parentGroup) {
      break;
    }

    currentParentId = parentGroup.parentGroupId;
  }

  return false;
};

// GET /api/groups - List all groups (auth required)
router.get('/', requireAuth, validateSearchQuery, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  // Build where clause with search
  const where: any = { deleted: false };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { displayId: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.group.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.group.count({ where })
  ]);

  const response: PaginatedResponse<Group> = {
    success: true,
    data: items.map(formatGroup),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/groups/:displayId - Get specific group (auth required)
router.get('/:displayId', requireAuth, validateDisplayIdParam, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  const item = await prisma.group.findFirst({
    where: { displayId, deleted: false }
  });

  if (!item) {
    throw createError(404, 'Group not found');
  }

  const response: ApiResponse<Group> = {
    success: true,
    data: formatGroup(item)
  };

  res.json(response);
}));

// POST /api/groups - Create new group (auth required)
router.post('/', requireAuth, canCreateGroup, validateBody(groupSchema), asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    throw createError(401, 'Authentication required');
  }

  // Get the user's first person to set as group admin
  const firstPerson = await getUserFirstPerson(userId);

  if (!firstPerson) {
    throw createError(400, 'You must create a Person profile before creating a Group');
  }

  // Create the group and assign the creator's first person as admin in a transaction
  const item = await prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: req.body
    });

    await tx.personGroup.create({
      data: {
        personId: firstPerson.id,
        groupId: group.id,
        isAdmin: true
      }
    });

    return group;
  });

  const response: ApiResponse<Group> = {
    success: true,
    data: formatGroup(item),
    message: 'Group created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/groups/:displayId - Update entire group (auth required)
router.put('/:displayId', requireAuth, validateDisplayIdParam, canModifyGroup, validateBody(groupSchema), asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  // Get the current group
  const currentGroup = await prisma.group.findFirst({
    where: { displayId, deleted: false }
  });

  if (!currentGroup) {
    throw createError(404, 'Group not found');
  }

  // Check if new displayId already exists (if it's being changed)
  if (req.body.displayId && req.body.displayId !== displayId) {
    const existingGroup = await prisma.group.findFirst({
      where: { displayId: req.body.displayId, deleted: false }
    });

    if (existingGroup) {
      throw createError(400, 'A group with this displayId already exists');
    }
  }

  // Check if parent group exists (if parentGroupId is provided)
  if (req.body.parentGroupId) {
    const parentExists = await prisma.group.findFirst({
      where: { id: req.body.parentGroupId, deleted: false }
    });

    if (!parentExists) {
      throw createError(400, 'Referenced parent group does not exist');
    }

    // Check for circular reference
    const isCircular = await checkCircularReference(currentGroup.id, req.body.parentGroupId);
    if (isCircular) {
      throw createError(400, 'Setting this parent would create a circular reference');
    }
  }

  const item = await prisma.group.update({
    where: { displayId },
    data: req.body
  });

  const response: ApiResponse<Group> = {
    success: true,
    data: formatGroup(item),
    message: 'Group updated successfully'
  };

  res.json(response);
}));

// PATCH /api/groups/:displayId - Partial update group (auth required)
router.patch('/:displayId', requireAuth, validateDisplayIdParam, canModifyGroup, validateBody(updateGroupSchema), asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  // Get the current group
  const currentGroup = await prisma.group.findFirst({
    where: { displayId, deleted: false }
  });

  if (!currentGroup) {
    throw createError(404, 'Group not found');
  }

  // Check if new displayId already exists (if it's being changed)
  if (req.body.displayId && req.body.displayId !== displayId) {
    const existingGroup = await prisma.group.findFirst({
      where: { displayId: req.body.displayId, deleted: false }
    });

    if (existingGroup) {
      throw createError(400, 'A group with this displayId already exists');
    }
  }

  // Check if parent group exists (if parentGroupId is being updated)
  if (req.body.parentGroupId) {
    const parentExists = await prisma.group.findFirst({
      where: { id: req.body.parentGroupId, deleted: false }
    });

    if (!parentExists) {
      throw createError(400, 'Referenced parent group does not exist');
    }

    // Check for circular reference
    const isCircular = await checkCircularReference(currentGroup.id, req.body.parentGroupId);
    if (isCircular) {
      throw createError(400, 'Setting this parent would create a circular reference');
    }
  }

  const item = await prisma.group.update({
    where: { displayId },
    data: req.body
  });

  const response: ApiResponse<Group> = {
    success: true,
    data: formatGroup(item),
    message: 'Group updated successfully'
  };

  res.json(response);
}));

// DELETE /api/groups/:displayId - Soft delete group (auth required)
router.delete('/:displayId', requireAuth, validateDisplayIdParam, canModifyGroup, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  await prisma.group.update({
    where: { displayId },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Group deleted successfully'
  };

  res.json(response);
}));

export default router;
