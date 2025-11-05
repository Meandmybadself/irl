import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { createError } from './error-handler.js';

export type PersonGroupViewAccess = {
  canViewAll: boolean;
  adminGroupIds: Set<number>;
};

export const canViewPersonGroups = async (userId: number, personId: number): Promise<PersonGroupViewAccess> => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deleted: false },
    select: { isSystemAdmin: true }
  });

  if (!user) {
    return {
      canViewAll: false,
      adminGroupIds: new Set<number>()
    };
  }

  if (user.isSystemAdmin) {
    return {
      canViewAll: true,
      adminGroupIds: new Set<number>()
    };
  }

  const person = await prisma.person.findFirst({
    where: { id: personId, deleted: false },
    select: { userId: true }
  });

  if (!person) {
    throw createError(404, 'Person not found');
  }

  if (person.userId === userId) {
    return {
      canViewAll: true,
      adminGroupIds: new Set<number>()
    };
  }

  const adminGroups = await prisma.personGroup.findMany({
    where: {
      isAdmin: true,
      person: {
        userId,
        deleted: false
      }
    },
    select: { groupId: true }
  });

  return {
    canViewAll: false,
    adminGroupIds: new Set(adminGroups.map(group => group.groupId))
  };
};

// Middleware to check if user can modify a person
export const canModifyPerson = async (req: Request, _res: Response, next: NextFunction) => {
  const { displayId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw createError(401, 'Authentication required');
  }

  // System admins can modify any person
  if (req.user?.isSystemAdmin) {
    next();
    return;
  }

  const person = await prisma.person.findFirst({
    where: { displayId, deleted: false }
  });

  if (!person) {
    throw createError(404, 'Person not found');
  }

  if (person.userId !== userId) {
    throw createError(403, 'Forbidden: You do not have permission to modify this person');
  }

  next();
};

// Middleware to check if user can view a person's private contact information
export const canViewPersonPrivateContacts = async (req: Request, _res: Response, next: NextFunction) => {
  const { displayId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw createError(401, 'Authentication required');
  }

  // System admins can view any person's private contacts
  if (req.user?.isSystemAdmin) {
    next();
    return;
  }

  const person = await prisma.person.findFirst({
    where: { displayId, deleted: false }
  });

  if (!person) {
    throw createError(404, 'Person not found');
  }

  // Attach a flag to the request to indicate if user owns this person
  (req as any).canViewPrivate = person.userId === userId;

  next();
};

/**
 * Middleware to check if user can modify a group.
 *
 * Authorization rules:
 * 1. System admins can modify any group
 * 2. Only users whose Person is marked as a group admin (isAdmin: true in PersonGroup) can modify the group
 * 3. When a user has multiple Persons, any Person associated with the group as an admin grants permission
 *
 */
export const canModifyGroup = async (req: Request, _res: Response, next: NextFunction) => {
  const { displayId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw createError(401, 'Authentication required');
  }

  // System admins can modify any group
  if (req.user?.isSystemAdmin) {
    next();
    return;
  }

  const group = await prisma.group.findFirst({
    where: { displayId, deleted: false },
    include: {
      people: {
        where: {
          person: { userId, deleted: false },
          isAdmin: true
        }
      }
    }
  });

  if (!group) {
    throw createError(404, 'Group not found');
  }

  // Check if user has any Person that is a group admin
  if (group.people.length === 0) {
    throw createError(403, 'Forbidden: You do not have permission to modify this group');
  }

  next();
};

// Middleware to check if user can view a group's private contact information
export const canViewGroupPrivateContacts = async (req: Request, _res: Response, next: NextFunction) => {
  const { displayId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw createError(401, 'Authentication required');
  }

  // System admins can view any group's private contacts
  if (req.user?.isSystemAdmin) {
    (req as any).canViewPrivate = true;
    next();
    return;
  }

  const group = await prisma.group.findFirst({
    where: { displayId, deleted: false },
    include: {
      people: {
        where: {
          person: { userId, deleted: false }
        }
      }
    }
  });

  if (!group) {
    throw createError(404, 'Group not found');
  }

  // User can view private contacts if they are a member or admin of the group
  (req as any).canViewPrivate = group.people.length > 0;

  next();
};

// Middleware to check if user can create a person (must own or be system admin)
export const canCreatePerson = async (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    throw createError(401, 'Authentication required');
  }

  // System admins can create persons for any user
  if (req.user?.isSystemAdmin) {
    next();
    return;
  }

  // If creating for a specific user, must be that user
  if (req.body.userId && req.body.userId !== userId) {
    throw createError(403, 'Forbidden: You can only create persons for yourself');
  }

  // Set userId to current user if not specified
  if (!req.body.userId) {
    req.body.userId = userId;
  }

  next();
};

// Middleware to check if user can create a group or subgroup
export const canCreateGroup = async (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    throw createError(401, 'Authentication required');
  }

  // System admins can always create groups
  if (req.user?.isSystemAdmin) {
    next();
    return;
  }

  // If creating a subgroup, check parent group permissions
  if (req.body.parentGroupId) {
    const parentGroup = await prisma.group.findFirst({
      where: { id: req.body.parentGroupId, deleted: false },
      include: {
        people: {
          where: {
            person: { userId, deleted: false }
          }
        }
      }
    });

    if (!parentGroup) {
      throw createError(400, 'Referenced parent group does not exist');
    }

    // Check if user is admin of parent group OR if parent allows any user to create subgroups
    const isParentAdmin = parentGroup.people.some(pg => pg.isAdmin);

    if (!isParentAdmin && !parentGroup.allowsAnyUserToCreateSubgroup) {
      throw createError(403, 'Forbidden: You do not have permission to create a subgroup under this parent');
    }
  }

  next();
};

/**
 * Middleware to check if user can modify a PersonGroup relationship.
 *
 * Authorization rules:
 * 1. System admins can modify any PersonGroup relationship
 * 2. Group admins (users with isAdmin: true in PersonGroup) can modify memberships for their group
 * 3. Users cannot modify their own admin status (prevents privilege escalation)
 * 4. Only admins can grant/revoke admin status to others
 *
 * This prevents:
 * - Unauthorized users from adding/removing group members
 * - Non-admins from granting themselves admin privileges
 * - Unauthorized privilege escalation
 */
export const canModifyPersonGroup = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError(401, 'Authentication required');
    }

    // System admins can modify any PersonGroup relationship
    if (req.user?.isSystemAdmin) {
      next();
      return;
    }

    // Get the groupId from the request (either from body for POST/PUT/PATCH or from existing record for DELETE)
    let groupId: number;
    let personGroupId: number | undefined;

    if (req.method === 'POST') {
      // For POST, groupId comes from body
      groupId = req.body.groupId;
    } else {
      // For PUT/PATCH/DELETE, get the PersonGroup record to find the groupId
      personGroupId = parseInt(req.params.id);
      const personGroup = await prisma.personGroup.findUnique({
        where: { id: personGroupId }
      });

      if (!personGroup) {
        throw createError(404, 'Person-group relationship not found');
      }

      groupId = personGroup.groupId;
    }

    // Check if user has any Person that is an admin of this group
    const group = await prisma.group.findFirst({
      where: { id: groupId, deleted: false },
      include: {
        people: {
          where: {
            person: { userId, deleted: false },
            isAdmin: true
          }
        }
      }
    });

    if (!group) {
      throw createError(404, 'Group not found');
    }

    if (group.people.length === 0) {
      throw createError(403, 'Forbidden: Only group administrators can modify group memberships');
    }

    // Additional check: Prevent users from granting themselves admin privileges
    // by checking if they're trying to modify their own PersonGroup record
    if (req.body.isAdmin !== undefined && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      const targetPersonId = req.body.personId || (personGroupId ? (await prisma.personGroup.findUnique({
        where: { id: personGroupId },
        select: { personId: true }
      }))?.personId : undefined);

      if (targetPersonId) {
        const targetPerson = await prisma.person.findFirst({
          where: { id: targetPersonId, deleted: false }
        });

        // Prevent users from modifying their own admin status
        if (targetPerson?.userId === userId) {
          throw createError(403, 'Forbidden: You cannot modify your own admin status');
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
