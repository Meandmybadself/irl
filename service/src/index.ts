import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server: Application = express();

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

server.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Hello World from IRL Service!' });
});

const PORT = process.env.SERVICE_PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`IRL Service running on port ${PORT}`);
  });
}

export { server, db };