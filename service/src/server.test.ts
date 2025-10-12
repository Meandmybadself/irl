import { describe, it, expect, beforeAll } from 'vitest'
import { describeIfDatabase } from './utils/describe-db.js'
import './test-setup.js'

describeIfDatabase('IRL Service', () => {
  let app: any

  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    process.env.SESSION_SECRET = 'test-secret'
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    process.env.CLIENT_URL = 'http://localhost:3000'
    process.env.SERVICE_PORT = '0'

    ;({ server: app } = await import('./index.js'))
  })

  it('should start the server successfully', async () => {
    expect(app).toBeDefined()
    expect(typeof app.listen).toBe('function')
  })

  it('should respond to GET / with hello world message', async () => {
    const request = await import('supertest')
    const response = await request.default(app).get('/')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      message: 'Hello World from IRL Service!'
    })
  })
})
