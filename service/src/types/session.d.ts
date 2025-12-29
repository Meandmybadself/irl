import 'express-session';

declare module 'express-session' {
  interface SessionData {
    originalUserId?: number;
    masqueradeUserId?: number;
  }
}
