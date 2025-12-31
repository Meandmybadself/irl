import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateDisplayIdParam, personInterestsSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { canViewPersonInterests, canModifyPersonInterests } from '../middleware/authorization.js';
import { updatePersonInterestVector } from '../utils/vector-helpers.js';
import type { ApiResponse, PersonInterest, Interest } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to format person interest response
const formatPersonInterest = (pi: any): PersonInterest & { interest?: Interest } => {
  return {
    id: pi.id,
    personId: pi.personId,
    interestId: pi.interestId,
    level: Number(pi.level),
    createdAt: pi.createdAt.toISOString(),
    updatedAt: pi.updatedAt.toISOString(),
    ...(pi.interest && {
      interest: {
        id: pi.interest.id,
        name: pi.interest.name,
        category: pi.interest.category,
        createdAt: pi.interest.createdAt.toISOString(),
        updatedAt: pi.interest.updatedAt.toISOString()
      }
    })
  };
};

// GET /api/persons/:displayId/interests - Get person's interests
router.get('/:displayId/interests', requireAuth, validateDisplayIdParam, canViewPersonInterests, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  const person = await prisma.person.findFirst({
    where: { displayId, deleted: false },
    include: {
      interests: {
        include: {
          interest: true
        },
        orderBy: {
          interest: {
            name: 'asc'
          }
        }
      }
    }
  });

  if (!person) {
    throw createError(404, 'Person not found');
  }

  const response: ApiResponse<(PersonInterest & { interest?: Interest })[]> = {
    success: true,
    data: person.interests.map(formatPersonInterest)
  };

  res.json(response);
}));

// PUT /api/persons/:displayId/interests - Set person's interests
router.put('/:displayId/interests', requireAuth, validateDisplayIdParam, canModifyPersonInterests, validateBody(personInterestsSchema), asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;
  const { interests } = req.body;

  const person = await prisma.person.findFirst({
    where: { displayId, deleted: false }
  });

  if (!person) {
    throw createError(404, 'Person not found');
  }

  // Validate all interest IDs exist and are not deleted
  if (interests.length > 0) {
    const interestIds: number[] = interests.map((i: { interestId: number; level: number }) => i.interestId);
    const uniqueInterestIds = [...new Set(interestIds)];
    
    const validInterests = await prisma.interest.findMany({
      where: {
        id: { in: uniqueInterestIds },
        deleted: false
      },
      select: { id: true }
    });

    const validInterestIds = new Set(validInterests.map(i => i.id));
    const invalidIds = uniqueInterestIds.filter((id: number) => !validInterestIds.has(id));

    if (invalidIds.length > 0) {
      throw createError(400, `Invalid interest IDs: ${invalidIds.join(', ')}`);
    }
  }

  // Use transaction to update interests
  const result = await prisma.$transaction(async (tx) => {
    // Delete all existing interests for this person
    await tx.personInterest.deleteMany({
      where: { personId: person.id }
    });

    // Create new interests
    if (interests.length > 0) {
      await tx.personInterest.createMany({
        data: interests.map((item: { interestId: number; level: number }) => ({
          personId: person.id,
          interestId: item.interestId,
          level: item.level
        }))
      });
    }

    // Return updated person with interests
    return tx.person.findUnique({
      where: { id: person.id },
      include: {
        interests: {
          include: {
            interest: true
          },
          orderBy: {
            interest: {
              name: 'asc'
            }
          }
        }
      }
    });
  });

  // Update interest vector after transaction completes
  // This must happen after the PersonInterest records are committed
  await updatePersonInterestVector(person.id);

  const response: ApiResponse<(PersonInterest & { interest?: Interest })[]> = {
    success: true,
    data: result!.interests.map(formatPersonInterest),
    message: 'Person interests updated successfully'
  };

  res.json(response);
}));

export default router;

