import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, personGroupSchema, updatePersonGroupSchema } from '../middleware/validation.js';
import type { ApiResponse, PaginatedResponse, PersonGroup } from '@irl/shared';

const router = Router();

// GET /api/person-groups - List all person-group relationships
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.personGroup.findMany({
      skip,
      take: limit,
      orderBy: { id: 'desc' }
    }),
    prisma.personGroup.count()
  ]);

  const response: PaginatedResponse<PersonGroup> = {
    success: true,
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/person-groups/:id - Get specific person-group relationship
router.get('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  
  const item = await prisma.personGroup.findUnique({
    where: { id }
  });

  if (!item) {
    throw createError(404, 'Person-group relationship not found');
  }

  const response: ApiResponse<PersonGroup> = {
    success: true,
    data: item
  };

  res.json(response);
}));

// POST /api/person-groups - Create new person-group relationship
router.post('/', validateBody(personGroupSchema), asyncHandler(async (req, res) => {
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
    data: req.body
  });

  const response: ApiResponse<PersonGroup> = {
    success: true,
    data: item,
    message: 'Person-group relationship created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/person-groups/:id - Update entire person-group relationship
router.put('/:id', validateIdParam, validateBody(personGroupSchema), asyncHandler(async (req, res) => {
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
router.patch('/:id', validateIdParam, validateBody(updatePersonGroupSchema), asyncHandler(async (req, res) => {
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
router.delete('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

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