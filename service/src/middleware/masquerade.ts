import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * Middleware to handle masquerade mode.
 * This runs after passport deserializes the user and swaps to the masqueraded user if needed.
 */
export const masqueradeMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Only process if user is authenticated and masquerade session exists
    if (!req.user || !req.session?.masqueradeUserId || !req.session?.originalUserId) {
      return next();
    }

    // Verify the original user is still a system admin
    const originalUser = await prisma.user.findFirst({
      where: { id: req.session.originalUserId, deleted: false }
    });

    if (!originalUser?.isSystemAdmin) {
      // Original user is no longer admin, clear masquerade
      delete req.session.originalUserId;
      delete req.session.masqueradeUserId;
      return next();
    }

    // Get the masqueraded user
    const masqueradeUser = await prisma.user.findFirst({
      where: { id: req.session.masqueradeUserId, deleted: false }
    });

    if (!masqueradeUser) {
      // Masquerade user no longer exists, clear masquerade
      delete req.session.originalUserId;
      delete req.session.masqueradeUserId;
      return next();
    }

    // Replace req.user with the masqueraded user
    // but keep a reference to the original for audit purposes
    (masqueradeUser as any).isMasquerading = true;
    (masqueradeUser as any).originalUserId = req.session.originalUserId;
    req.user = masqueradeUser;

    next();
  } catch (error) {
    next(error);
  }
};
