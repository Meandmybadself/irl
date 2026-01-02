import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse, PersonWithDistance, GroupWithDistance, NearbyResponse } from '@irl/shared';
import { Prisma } from '@prisma/client';

const router: ReturnType<typeof Router> = Router();

// Helper to format person response with distance
const formatPersonWithDistance = (person: any, distance: number): PersonWithDistance => {
  const { deleted, ...personWithoutDeleted } = person;
  void deleted;
  return {
    ...personWithoutDeleted,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
    distance
  };
};

// Helper to format group response with distance
const formatGroupWithDistance = (group: any, distance: number): GroupWithDistance => {
  const { deleted, ...groupWithoutDeleted } = group;
  void deleted;
  return {
    ...groupWithoutDeleted,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    distance
  };
};

// GET /api/nearby - Find nearby persons and groups
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const radius = parseFloat(req.query.radius as string) || 1; // Default 1 mile
  const user = req.user!;
  const currentPersonId = req.session.currentPersonId;

  if (!currentPersonId) {
    // No current person selected - return empty results
    const response: ApiResponse<NearbyResponse> = {
      success: true,
      data: {
        persons: [],
        groups: [],
        referencePointsCount: 0
      }
    };
    res.json(response);
    return;
  }

  const isSystemAdmin = user.isSystemAdmin;

  // Step 1: Get reference locations (current person's addresses + group addresses)
  type RefLocation = { latitude: Prisma.Decimal; longitude: Prisma.Decimal };

  const refLocations = await prisma.$queryRaw<RefLocation[]>`
    SELECT DISTINCT ci.latitude, ci.longitude
    FROM contact_information ci
    LEFT JOIN person_contact_information pci ON ci.id = pci."contactInformationId"
    LEFT JOIN group_contact_information gci ON ci.id = gci."contactInformationId"
    LEFT JOIN person_groups pg ON gci."groupId" = pg."groupId"
    WHERE (
      (pci."personId" = ${currentPersonId}) OR
      (pg."personId" = ${currentPersonId})
    )
    AND ci.type = 'ADDRESS'
    AND ci.latitude IS NOT NULL
    AND ci.longitude IS NOT NULL
    AND ci.deleted = false
    AND (ci.privacy = 'PUBLIC' OR ${isSystemAdmin} = true)
  `;

  // If no reference locations, return empty results
  if (refLocations.length === 0) {
    const response: ApiResponse<NearbyResponse> = {
      success: true,
      data: {
        persons: [],
        groups: [],
        referencePointsCount: 0
      }
    };
    res.json(response);
    return;
  }

  // Step 2: Find nearby persons
  // For each person, calculate distance from each reference point and use the minimum
  type PersonResult = {
    id: number;
    firstName: string;
    lastName: string;
    displayId: string;
    pronouns: string | null;
    imageURL: string | null;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
    deleted: boolean;
    min_distance: number;
  };

  const nearbyPersons: PersonResult[] = [];

  for (const refLocation of refLocations) {
    const lat1 = parseFloat(refLocation.latitude.toString());
    const lon1 = parseFloat(refLocation.longitude.toString());

    // Query for persons near this reference point
    const persons = await prisma.$queryRaw<PersonResult[]>`
      SELECT DISTINCT
        p.id,
        p."firstName",
        p."lastName",
        p."displayId",
        p.pronouns,
        p."imageURL",
        p."userId",
        p."createdAt",
        p."updatedAt",
        p.deleted,
        MIN(
          2 * 3959 * ASIN(SQRT(
            POWER(SIN((CAST(ci.latitude AS DECIMAL) - ${lat1}) * pi()/180 / 2), 2) +
            COS(${lat1} * pi()/180) * COS(CAST(ci.latitude AS DECIMAL) * pi()/180) *
            POWER(SIN((CAST(ci.longitude AS DECIMAL) - ${lon1}) * pi()/180 / 2), 2)
          ))
        ) as min_distance
      FROM people p
      JOIN person_contact_information pci ON p.id = pci."personId"
      JOIN contact_information ci ON pci."contactInformationId" = ci.id
      WHERE p.deleted = false
        AND p.id != ${currentPersonId}
        AND ci.type = 'ADDRESS'
        AND ci.latitude IS NOT NULL
        AND ci.longitude IS NOT NULL
        AND ci.deleted = false
        AND (ci.privacy = 'PUBLIC' OR ${isSystemAdmin} = true)
      GROUP BY p.id, p."firstName", p."lastName", p."displayId", p.pronouns, p."imageURL", p."userId", p."createdAt", p."updatedAt", p.deleted
      HAVING MIN(
        2 * 3959 * ASIN(SQRT(
          POWER(SIN((CAST(ci.latitude AS DECIMAL) - ${lat1}) * pi()/180 / 2), 2) +
          COS(${lat1} * pi()/180) * COS(CAST(ci.latitude AS DECIMAL) * pi()/180) *
          POWER(SIN((CAST(ci.longitude AS DECIMAL) - ${lon1}) * pi()/180 / 2), 2)
        ))
      ) <= ${radius}
    `;

    nearbyPersons.push(...persons);
  }

  // Deduplicate persons and keep minimum distance
  const personMap = new Map<number, PersonResult>();
  for (const person of nearbyPersons) {
    const existing = personMap.get(person.id);
    if (!existing || person.min_distance < existing.min_distance) {
      personMap.set(person.id, person);
    }
  }

  // Step 3: Find nearby groups
  type GroupResult = {
    id: number;
    displayId: string;
    name: string;
    description: string | null;
    parentGroupId: number | null;
    allowsAnyUserToCreateSubgroup: boolean;
    publiclyVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
    deleted: boolean;
    min_distance: number;
  };

  const nearbyGroups: GroupResult[] = [];

  for (const refLocation of refLocations) {
    const lat1 = parseFloat(refLocation.latitude.toString());
    const lon1 = parseFloat(refLocation.longitude.toString());

    // Query for groups near this reference point
    const groups = await prisma.$queryRaw<GroupResult[]>`
      SELECT DISTINCT
        g.id,
        g."displayId",
        g.name,
        g.description,
        g."parentGroupId",
        g."allowsAnyUserToCreateSubgroup",
        g."publiclyVisible",
        g."createdAt",
        g."updatedAt",
        g.deleted,
        MIN(
          2 * 3959 * ASIN(SQRT(
            POWER(SIN((CAST(ci.latitude AS DECIMAL) - ${lat1}) * pi()/180 / 2), 2) +
            COS(${lat1} * pi()/180) * COS(CAST(ci.latitude AS DECIMAL) * pi()/180) *
            POWER(SIN((CAST(ci.longitude AS DECIMAL) - ${lon1}) * pi()/180 / 2), 2)
          ))
        ) as min_distance
      FROM groups g
      JOIN group_contact_information gci ON g.id = gci."groupId"
      JOIN contact_information ci ON gci."contactInformationId" = ci.id
      WHERE g.deleted = false
        AND ci.type = 'ADDRESS'
        AND ci.latitude IS NOT NULL
        AND ci.longitude IS NOT NULL
        AND ci.deleted = false
        AND (ci.privacy = 'PUBLIC' OR ${isSystemAdmin} = true)
        AND NOT EXISTS (
          SELECT 1 FROM person_groups pg
          WHERE pg."groupId" = g.id
          AND pg."personId" = ${currentPersonId}
        )
      GROUP BY g.id, g."displayId", g.name, g.description, g."parentGroupId", g."allowsAnyUserToCreateSubgroup", g."publiclyVisible", g."createdAt", g."updatedAt", g.deleted
      HAVING MIN(
        2 * 3959 * ASIN(SQRT(
          POWER(SIN((CAST(ci.latitude AS DECIMAL) - ${lat1}) * pi()/180 / 2), 2) +
          COS(${lat1} * pi()/180) * COS(CAST(ci.latitude AS DECIMAL) * pi()/180) *
          POWER(SIN((CAST(ci.longitude AS DECIMAL) - ${lon1}) * pi()/180 / 2), 2)
        ))
      ) <= ${radius}
    `;

    nearbyGroups.push(...groups);
  }

  // Deduplicate groups and keep minimum distance
  const groupMap = new Map<number, GroupResult>();
  for (const group of nearbyGroups) {
    const existing = groupMap.get(group.id);
    if (!existing || group.min_distance < existing.min_distance) {
      groupMap.set(group.id, group);
    }
  }

  // Step 4: Format and sort results
  const personsWithDistance = Array.from(personMap.values())
    .map(p => formatPersonWithDistance(p, p.min_distance))
    .sort((a, b) => a.distance - b.distance);

  const groupsWithDistance = Array.from(groupMap.values())
    .map(g => formatGroupWithDistance(g, g.min_distance))
    .sort((a, b) => a.distance - b.distance);

  const response: ApiResponse<NearbyResponse> = {
    success: true,
    data: {
      persons: personsWithDistance,
      groups: groupsWithDistance,
      referencePointsCount: refLocations.length
    }
  };

  res.json(response);
}));

export default router;
