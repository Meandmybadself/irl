import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, personSchema, updatePersonSchema } from '../middleware/validation.js';
import type { ApiResponse, PaginatedResponse, Person } from '@irl/shared';

const router = Router();

// Helper to format person response
const formatPerson = (person: any): Person => ({
  ...person,
  createdAt: person.createdAt.toISOString(),
  updatedAt: person.updatedAt.toISOString()
});

// GET /api/persons - List all persons
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.person.findMany({
      where: { deleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.person.count({ where: { deleted: false } })
  ]);

  const response: PaginatedResponse<Person> = {
    success: true,
    data: items.map(formatPerson),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/persons/:id - Get specific person
router.get('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  
  const item = await prisma.person.findFirst({
    where: { id, deleted: false }
  });

  if (!item) {
    throw createError(404, 'Person not found');
  }

  const response: ApiResponse<Person> = {
    success: true,
    data: formatPerson(item)
  };

  res.json(response);
}));

// POST /api/persons - Create new person
router.post('/', validateBody(personSchema), asyncHandler(async (req, res) => {
  // Check if user exists
  const userExists = await prisma.user.findFirst({
    where: { id: req.body.userId, deleted: false }
  });

  if (!userExists) {
    throw createError(400, 'Referenced user does not exist');
  }

  const item = await prisma.person.create({
    data: req.body
  });

  const response: ApiResponse<Person> = {
    success: true,
    data: formatPerson(item),
    message: 'Person created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/persons/:id - Update entire person
router.put('/:id', validateIdParam, validateBody(personSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Check if user exists
  const userExists = await prisma.user.findFirst({
    where: { id: req.body.userId, deleted: false }
  });

  if (!userExists) {
    throw createError(400, 'Referenced user does not exist');
  }

  const item = await prisma.person.update({
    where: { id },
    data: req.body
  });

  const response: ApiResponse<Person> = {
    success: true,
    data: formatPerson(item),
    message: 'Person updated successfully'
  };

  res.json(response);
}));

// PATCH /api/persons/:id - Partial update person
router.patch('/:id', validateIdParam, validateBody(updatePersonSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Check if user exists (if userId is being updated)
  if (req.body.userId) {
    const userExists = await prisma.user.findFirst({
      where: { id: req.body.userId, deleted: false }
    });

    if (!userExists) {
      throw createError(400, 'Referenced user does not exist');
    }
  }

  const item = await prisma.person.update({
    where: { id },
    data: req.body
  });

  const response: ApiResponse<Person> = {
    success: true,
    data: formatPerson(item),
    message: 'Person updated successfully'
  };

  res.json(response);
}));

// DELETE /api/persons/:id - Soft delete person
router.delete('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.person.update({
    where: { id },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Person deleted successfully'
  };

  res.json(response);
}));

export default router;