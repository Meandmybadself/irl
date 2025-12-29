import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';

// Configure local strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findFirst({
          where: { email, deleted: false }
        });

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user to session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async function(this: any, id: number, done) {
  try {
    // Check if we're in masquerade mode
    const userId = this.masqueradeUserId || id;

    const user = await prisma.user.findFirst({
      where: { id: userId, deleted: false }
    });

    if (!user) {
      return done(null, false);
    }

    // If masquerading, preserve the original user's admin status
    if (this.masqueradeUserId && this.originalUserId) {
      const originalUser = await prisma.user.findFirst({
        where: { id: this.originalUserId, deleted: false }
      });

      // Only allow masquerade if the original user is a system admin
      if (!originalUser?.isSystemAdmin) {
        // Clear masquerade if original user is not admin
        delete this.originalUserId;
        delete this.masqueradeUserId;
        return done(null, user);
      }

      // Attach a flag to indicate we're masquerading
      (user as any).isMasquerading = true;
      (user as any).originalUserId = this.originalUserId;
    }

    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
