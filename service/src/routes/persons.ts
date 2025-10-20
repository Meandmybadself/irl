import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, personSchema, updatePersonSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeSearchQuery, sanitizePaginationParams } from '../utils/sanitization.js';
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
  // Sanitize pagination parameters
  const { page, limit, skip } = sanitizePaginationParams(
    req.query.page as string,
    req.query.limit as string
  );

  // Sanitize search query
  const searchQuery = sanitizeSearchQuery(req.query.search as string);

  // Build where clause with search if provided
  const where: any = { deleted: false };
  if (searchQuery) {
    where.OR = [
      { firstName: { contains: searchQuery, mode: 'insensitive' } },
      { lastName: { contains: searchQuery, mode: 'insensitive' } },
      { displayId: { contains: searchQuery, mode: 'insensitive' } }
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

// GET /api/persons/:id - Get specific person (auth required)
router.get('/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
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

// POST /api/persons - Create new person (auth required)
router.post('/', requireAuth, validateBody(personSchema), asyncHandler(async (req, res) => {
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

// PUT /api/persons/:id - Update entire person (auth required)
router.put('/:id', requireAuth, validateIdParam, validateBody(personSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

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

// PATCH /api/persons/:id - Partial update person (auth required)
router.patch('/:id', requireAuth, validateIdParam, validateBody(updatePersonSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

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

// DELETE /api/persons/:id - Soft delete person (auth required)
router.delete('/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
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
