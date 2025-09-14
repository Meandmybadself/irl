import { Request } from 'express';

export interface TestUser {
  id: number;
  email: string;
  isSystemAdmin: boolean;
  deleted: boolean;
}

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 1,
  email: 'test@example.com',
  isSystemAdmin: false,
  deleted: false,
  ...overrides
});

export const createTestSystemAdmin = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 1,
  email: 'admin@example.com',
  isSystemAdmin: true,
  deleted: false,
  ...overrides
});

// Helper to mock authenticated request for testing
export const mockAuthenticatedRequest = (req: any, user: TestUser) => {
  req.user = user;
  return req;
};

// Middleware to set up test authentication - use in test setup
export const setupTestAuth = (user?: TestUser) => {
  return (req: Request, _res: any, next: any) => {
    if (user) {
      req.user = user;
    }
    next();
  };
};

// Helper to attach testUser to request for authentication bypass
export const withAuth = (request: any, user: TestUser = createTestUser()) => {
  return request.set('X-Test-User', JSON.stringify(user));
};