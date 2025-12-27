import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateDisplayIdParam } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { canViewPersonInterests } from '../middleware/authorization.js';
import type { ApiResponse, Person } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to format person response
const formatPerson = (person: any): Person => {
  const { deleted, interest_vector, ...personWithoutDeleted } = person;
  void deleted;
  void interest_vector;
  return {
    ...personWithoutDeleted,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString()
  };
};

// GET /api/persons/:displayId/recommendations - Get recommended persons based on cosine similarity
router.get('/:displayId/recommendations', requireAuth, validateDisplayIdParam, canViewPersonInterests, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

  const person = await prisma.person.findFirst({
    where: { displayId, deleted: false }
  });

  if (!person) {
    throw createError(404, 'Person not found');
  }

  // Check if person has interests (non-null interest_vector)
  const personWithVector = await prisma.$queryRawUnsafe<Array<{ interest_vector: string | null }>>(
    `SELECT interest_vector FROM people WHERE id = $1`,
    person.id
  );

  if (!personWithVector[0] || !personWithVector[0].interest_vector) {
    throw createError(400, 'Person has no interests defined');
  }

  // Use pgvector cosine similarity to find similar persons
  // 1 - (vector <=> other_vector) gives cosine similarity (higher is more similar)
  const recommendations = await prisma.$queryRawUnsafe<Array<{
    id: number;
    firstName: string;
    lastName: string;
    displayId: string;
    pronouns: string | null;
    imageURL: string | null;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
    similarity: number;
  }>>(
    `SELECT 
      p.id,
      p."firstName",
      p."lastName",
      p."displayId",
      p.pronouns,
      p."imageURL",
      p."userId",
      p."createdAt",
      p."updatedAt",
      1 - (p.interest_vector <=> target.interest_vector) as similarity
    FROM people p
    CROSS JOIN (
      SELECT interest_vector FROM people WHERE id = $1
    ) as target
    WHERE p.interest_vector IS NOT NULL
      AND p.id != $1
      AND p.deleted = false
    ORDER BY similarity DESC
    LIMIT $2`,
    person.id,
    limit
  );

  const response: ApiResponse<Array<Person & { similarity?: number }>> = {
    success: true,
    data: recommendations.map(rec => ({
      ...formatPerson(rec),
      similarity: Number(rec.similarity)
    }))
  };

  res.json(response);
}));

export default router;


