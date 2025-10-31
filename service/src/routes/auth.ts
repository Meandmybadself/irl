import { Router } from 'express';
import passport from 'passport';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, loginSchema, resendVerificationSchema } from '../middleware/validation.js';
import type { ApiResponse, User, Person } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to exclude sensitive fields
const excludeSensitiveFields = (user: any): User => {
  const { password, verificationToken, deleted, ...userWithoutSensitive } = user;
  void password;
  void verificationToken;
  void deleted;
  return {
    ...userWithoutSensitive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
};

const excludePersonSensitiveFields = (person: any): Person => {
  const { deleted, ...personWithoutSensitive } = person;
  void deleted;
  return {
    ...personWithoutSensitive,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString()
  };
};

// POST /api/auth/login - Login user
router.post('/login', validateBody(loginSchema), (req, res, next) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: info?.message || 'Invalid credentials'
      });
    }

    let person: Person | null = null;

    // Check if user email is verified
    if (user.verificationToken) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before logging in'
      });
    }

    req.login(user, async (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }


      const response: ApiResponse<{ user: User; person?: Person }> = {
        success: true,
        data: {
          user: excludeSensitiveFields(user),
          person: person ? excludePersonSensitiveFields(person) : undefined
        },
        message: 'Login successful'
      };

      return res.json(response);
    });
  })(req, res, next);
});

// POST /api/auth/logout - Logout user
router.post('/logout', asyncHandler(async (req, res) => {
  req.logout((err) => {
    if (err) {
      throw createError(500, 'Logout failed');
    }

    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        throw createError(500, 'Session destruction failed');
      }

      res.clearCookie('connect.sid');

      const response: ApiResponse<null> = {
        success: true,
        message: 'Logout successful'
      };

      res.json(response);
    });
  });
}));

// GET /api/auth/session - Get current session
router.get('/session', asyncHandler(async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    throw createError(401, 'Not authenticated');
  }

  const user = req.user as any;

  // Get associated person
  const person = await prisma.person.findFirst({
    where: { userId: user.id, deleted: false }
  });

  const response: ApiResponse<{ user: User; person?: Person }> = {
    success: true,
    data: {
      user: excludeSensitiveFields(user),
      person: person ? excludePersonSensitiveFields(person) : undefined
    }
  };

  res.json(response);
}));

// POST /api/auth/resend-verification - Resend verification email
router.post('/resend-verification', validateBody(resendVerificationSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findFirst({
    where: { email, deleted: false }
  });

  if (!user) {
    // Don't reveal if user exists or not for security
    const response: ApiResponse<null> = {
      success: true,
      message: 'If the email exists, a verification link has been sent'
    };
    res.json(response);
    return;
  }

  if (!user.verificationToken) {
    const response: ApiResponse<null> = {
      success: true,
      message: 'Email is already verified'
    };
    res.json(response);
    return;
  }

  // In a real implementation, resend the verification email here
  // await sendVerificationEmail(user.email, user.verificationToken);

  const response: ApiResponse<null> = {
    success: true,
    message: 'Verification email sent'
  };

  res.json(response);
}));

export default router;
