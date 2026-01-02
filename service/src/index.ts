import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './lib/prisma.js';

// Import passport configuration
import passport from './config/passport.js';

// Import routes
import authRoutes from './routes/auth.js';
import contactInformationRoutes from './routes/contact-information.js';
import userRoutes from './routes/users.js';
import personRoutes from './routes/persons.js';
import systemRoutes from './routes/system.js';
import groupRoutes from './routes/groups.js';
import claimRoutes from './routes/claims.js';
import groupInviteRoutes from './routes/group-invites.js';
import personGroupRoutes from './routes/person-groups.js';
import contactMappingRoutes from './routes/contact-mappings.js';
import interestsRoutes from './routes/interests.js';
import personInterestsRoutes from './routes/person-interests.js';
import personRecommendationsRoutes from './routes/person-recommendations.js';
import auditLogsRoutes from './routes/audit-logs.js';
import masqueradeRoutes from './routes/masquerade.js';

// Import middleware
import { errorHandler } from './middleware/error-handler.js';
import { auditLogger } from './middleware/audit-logger.js';
import { masqueradeMiddleware } from './middleware/masquerade.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server: Application = express();

// Keep pg pool for session store
const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

server.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

server.use(morgan('combined'));
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(cookieParser());

server.use(express.static(path.join(__dirname, '../public')));

server.use(session({
  store: new (connectPgSimple(session))({
    pool: db,
    tableName: 'sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET as string,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

server.use(passport.initialize());
server.use(passport.session());

// Masquerade middleware (must be after passport but before routes)
server.use(masqueradeMiddleware);

// Audit logging middleware (must be after passport but before routes)
server.use(auditLogger);

// API Routes
server.use('/api/auth', authRoutes);
server.use('/api/contact-information', contactInformationRoutes);
server.use('/api/users', userRoutes);
server.use('/api/persons', personRoutes);
server.use('/api/system', systemRoutes);
server.use('/api/groups', groupRoutes);
server.use('/api/claims', claimRoutes);
server.use('/api/group-invites', groupInviteRoutes);
server.use('/api/person-groups', personGroupRoutes);
server.use('/api/contact-mappings', contactMappingRoutes);
server.use('/api/interests', interestsRoutes);
server.use('/api/persons', personInterestsRoutes);
server.use('/api/persons', personRecommendationsRoutes);
server.use('/api/audit-logs', auditLogsRoutes);
server.use('/api/masquerade', masqueradeRoutes);

server.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Hello World from IRL Service!' });
});

// Health check endpoint for monitoring and load balancers
server.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Global error handler (must be last)
server.use(errorHandler);

const PORT = process.env.SERVICE_PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`IRL Service running on port ${PORT}`);
  });
}


export { server, db, prisma };