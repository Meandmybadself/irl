import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateDisplayIdParam, validateSearchQuery, personSchema, updatePersonSchema, bulkPersonsSchema } from '../middleware/validation.js';
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
router.get('/', requireAuth, validateSearchQuery, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;

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

// POST /api/persons/bulk - Create multiple persons (auth required)
router.post('/bulk', requireAuth, canCreatePerson, validateBody(bulkPersonsSchema), asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    throw createError(401, 'Authentication required');
  }

  const personsData = req.body as Array<{
    firstName: string;
    lastName: string;
    displayId: string;
    pronouns?: string | null;
    imageURL?: string | null;
    userId: number;
    contactInformations?: Array<{
      type: 'EMAIL' | 'PHONE' | 'ADDRESS' | 'URL';
      label: string;
      value: string;
      privacy: 'PRIVATE' | 'PUBLIC';
    }>;
  }>;

  // Process all persons in a transaction
  const results = await prisma.$transaction(async (tx) => {
    const createdPersons: Array<{ success: boolean; data?: Person; error?: string; displayId: string }> = [];

    for (const personData of personsData) {
      try {
        // Check if displayId already exists
        const existing = await tx.person.findFirst({
          where: { displayId: personData.displayId, deleted: false }
        });

        if (existing) {
          createdPersons.push({
            success: false,
            error: `Person with displayId '${personData.displayId}' already exists`,
            displayId: personData.displayId
          });
          continue;
        }

        const { contactInformations, ...personFields } = personData;

        // Create person
        const person = await tx.person.create({
          data: personFields
        });

        // Create contact informations if provided
        if (contactInformations && contactInformations.length > 0) {
          for (const contactInfo of contactInformations) {
            const contact = await tx.contactInformation.create({
              data: contactInfo
            });

            await tx.personContactInformation.create({
              data: {
                personId: person.id,
                contactInformationId: contact.id
              }
            });
          }
        }

        createdPersons.push({
          success: true,
          data: formatPerson(person),
          displayId: personData.displayId
        });
      } catch (error) {
        createdPersons.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          displayId: personData.displayId
        });
      }
    }

    return createdPersons;
  });

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  res.status(201).json({
    success: true,
    data: results,
    message: `Created ${successCount} person(s). ${failureCount} failed.`
  });
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
