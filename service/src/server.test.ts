import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server } from './index.js';

describe('IRL Service', () => {
  let serverInstance: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SESSION_SECRET = 'test-secret';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.CLIENT_URL = 'http://localhost:3000';
    process.env.SERVICE_PORT = '0';
  });

  afterAll(async () => {
    if (serverInstance) {
      serverInstance.close();
    }
  });

  it('should start the server successfully', async () => {
    expect(server).toBeDefined();
    expect(typeof server.listen).toBe('function');
  });

  it('should respond to GET / with hello world message', async () => {
    const request = await import('supertest');
    const response = await request.default(server).get('/');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ 
      message: 'Hello World from IRL Service!' 
    });
  });
});