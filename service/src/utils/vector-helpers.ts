import { prisma } from '../lib/prisma.js';

/**
 * Gets all non-deleted interests ordered by ID
 * This ensures consistent vector dimension ordering
 */
export const getAllInterestsOrdered = async () => {
  return prisma.interest.findMany({
    where: { deleted: false },
    orderBy: { id: 'asc' },
    select: { id: true }
  });
};

/**
 * Gets the interest vector for a person
 * Returns array of levels corresponding to ordered interests (0 if not set)
 */
export const getPersonInterestVector = async (personId: number): Promise<number[]> => {
  const interests = await getAllInterestsOrdered();
  const personInterests = await prisma.personInterest.findMany({
    where: { personId },
    select: { interestId: true, level: true }
  });

  const interestMap = new Map(
    personInterests.map((pi: any) => [pi.interestId, Number(pi.level)])
  );

  return interests.map((interest: any) => interestMap.get(interest.id) || 0);
};

/**
 * Normalizes a vector using L2 normalization
 */
export const normalizeVector = (vector: number[]): number[] => {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) {
    return vector; // Zero vector, return as-is
  }
  return vector.map(val => val / magnitude);
};

/**
 * Converts a number array to pgvector format string
 * Format: [0.1,0.2,0.3]
 */
export const vectorToPgString = (vector: number[]): string => {
  return '[' + vector.map(v => v.toString()).join(',') + ']';
};

/**
 * Computes and updates the interest vector for a person
 */
export const updatePersonInterestVector = async (personId: number): Promise<void> => {
  const vector = await getPersonInterestVector(personId);
  const normalizedVector = normalizeVector(vector);

  // Check if vector is non-zero (person has at least one interest)
  const hasInterests = normalizedVector.some(v => v !== 0);

  if (hasInterests) {
    const vectorString = vectorToPgString(normalizedVector);
    // Use raw SQL to update vector column (Prisma doesn't support pgvector types)
    await prisma.$executeRawUnsafe(
      `UPDATE people SET interest_vector = $1::vector WHERE id = $2`,
      vectorString,
      personId
    );
  } else {
    // Set to NULL if no interests
    await prisma.$executeRawUnsafe(
      `UPDATE people SET interest_vector = NULL WHERE id = $1`,
      personId
    );
  }
};

/**
 * Gets the dimension of the interest vector (number of non-deleted interests)
 */
export const getInterestVectorDimension = async (): Promise<number> => {
  const count = await prisma.interest.count({
    where: { deleted: false }
  });
  return count;
};

/**
 * Validates that a vector dimension matches the current interest count
 * Throws error if dimension mismatch
 */
export const validateVectorDimension = async (vector: number[]): Promise<void> => {
  const expectedDimension = await getInterestVectorDimension();
  if (vector.length !== expectedDimension) {
    throw new Error(
      `Vector dimension mismatch: expected ${expectedDimension}, got ${vector.length}`
    );
  }
};

