import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateDisplayIdParam, personSchema, updatePersonSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { canModifyPerson, canCreatePerson } from '../middleware/authorization.js';
import type { ApiResponse, PaginatedResponse, Person } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to format person response
const formatPerson = (person: any): Person => {
  const { deleted, ...personWithoutDeleted } = person;
  void deleted;
  return {
    ...personWithoutDeleted,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString()
  };
};

// GET /api/persons - List all persons (auth required)
// Supports optional search query parameter: ?search=term
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  if (search && search.length > 100) {
    throw createError(400, 'Search query too long');
  }

  // Build where clause with search
  const where: any = { deleted: false };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { displayId: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.person.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.person.count({ where })
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

// GET /api/persons/:displayId - Get specific person (auth required)
router.get('/:displayId', requireAuth, validateDisplayIdParam, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  const item = await prisma.person.findFirst({
    where: { displayId, deleted: false }
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

// POST /api/persons - Create new person (auth required)
router.post('/', requireAuth, canCreatePerson, validateBody(personSchema), asyncHandler(async (req, res) => {
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

// PUT /api/persons/:displayId - Update entire person (auth required)
router.put('/:displayId', requireAuth, validateDisplayIdParam, canModifyPerson, validateBody(personSchema), asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  // Check if new displayId already exists (if it's being changed)
  if (req.body.displayId && req.body.displayId !== displayId) {
    const existingPerson = await prisma.person.findFirst({
      where: { displayId: req.body.displayId, deleted: false }
    });

    if (existingPerson) {
      throw createError(400, 'A person with this displayId already exists');
    }
  }

  const item = await prisma.person.update({
    where: { displayId },
    data: req.body
  });

  const response: ApiResponse<Person> = {
    success: true,
    data: formatPerson(item),
    message: 'Person updated successfully'
  };

  res.json(response);
}));

// PATCH /api/persons/:displayId - Partial update person (auth required)
router.patch('/:displayId', requireAuth, validateDisplayIdParam, canModifyPerson, validateBody(updatePersonSchema), asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  // Check if new displayId already exists (if it's being changed)
  if (req.body.displayId && req.body.displayId !== displayId) {
    const existingPerson = await prisma.person.findFirst({
      where: { displayId: req.body.displayId, deleted: false }
    });

    if (existingPerson) {
      throw createError(400, 'A person with this displayId already exists');
    }
  }

  const item = await prisma.person.update({
    where: { displayId },
    data: req.body
  });

  const response: ApiResponse<Person> = {
    success: true,
    data: formatPerson(item),
    message: 'Person updated successfully'
  };

  res.json(response);
}));

// DELETE /api/persons/:displayId - Soft delete person (auth required)
router.delete('/:displayId', requireAuth, validateDisplayIdParam, canModifyPerson, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  await prisma.person.update({
    where: { displayId },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Person deleted successfully'
  };

  res.json(response);
}));

export default router;
