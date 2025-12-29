import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSystemAdmin } from '../middleware/authorization.js';
import type { ApiResponse } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// POST /api/masquerade/start - Start masquerading as another user
router.post('/start', requireAuth, requireSystemAdmin, asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({
      success: false,
      error: 'Email is required'
    });
    return;
  }

  // Find the user to masquerade as
  const targetUser = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase(),
      deleted: false
    }
  });

  if (!targetUser) {
    res.status(404).json({
      success: false,
      error: 'User not found'
    });
    return;
  }

  // Don't allow masquerading as yourself
  if (targetUser.id === req.user!.id) {
    res.status(400).json({
      success: false,
      error: 'Cannot masquerade as yourself'
    });
    return;
  }

  // Store the original user ID in the session
  if (req.session) {
    req.session.originalUserId = req.user!.id;
    req.session.masqueradeUserId = targetUser.id;
  }

  const response: ApiResponse<{ email: string; isSystemAdmin: boolean }> = {
    success: true,
    data: {
      email: targetUser.email,
      isSystemAdmin: targetUser.isSystemAdmin
    }
  };

  res.json(response);
}));

// POST /api/masquerade/exit - Exit masquerade mode
router.post('/exit', requireAuth, asyncHandler(async (req, res) => {
  if (req.session) {
    delete req.session.originalUserId;
    delete req.session.masqueradeUserId;
  }

  const response: ApiResponse<{ success: boolean }> = {
    success: true,
    data: { success: true }
  };

  res.json(response);
}));

// GET /api/masquerade/status - Get current masquerade status
router.get('/status', requireAuth, asyncHandler(async (req, res) => {
  const isMasquerading = !!(req.session?.originalUserId && req.session?.masqueradeUserId);

  let masqueradeInfo = null;
  if (isMasquerading) {
    const originalUser = await prisma.user.findUnique({
      where: { id: req.session!.originalUserId },
      select: { email: true, isSystemAdmin: true }
    });

    const masqueradeUser = await prisma.user.findUnique({
      where: { id: req.session!.masqueradeUserId },
      select: { email: true, isSystemAdmin: true }
    });

    masqueradeInfo = {
      originalUserEmail: originalUser?.email,
      masqueradeUserEmail: masqueradeUser?.email
    };
  }

  const response: ApiResponse<{ isMasquerading: boolean; masqueradeInfo: any }> = {
    success: true,
    data: {
      isMasquerading,
      masqueradeInfo
    }
  };

  res.json(response);
}));

export default router;
