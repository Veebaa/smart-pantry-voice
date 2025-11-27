import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { z } from 'zod';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
};

vi.mock('../../../server/db.js', () => ({
  getDb: () => mockDb,
  initializeDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockImplementation((password: string, hash: string) => {
      return Promise.resolve(password === 'ValidPass123');
    }),
  },
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockReturnValue({
    toString: () => 'mock_session_token_12345678901234567890123456789012',
  }),
  randomUUID: vi.fn().mockReturnValue('mock-uuid-1234'),
}));

describe('Auth API Integration Tests', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    
    const { default: router } = await import('../../../server/routes.js');
    app.use(router);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: 'user-123',
          email: 'test@example.com',
          passwordHash: 'hashed_password',
        }]),
      }),
    });

    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'ValidPass123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'ValidPass123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject weak passwords - too short', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'short1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 characters');
    });

    it('should reject passwords without uppercase', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'lowercase123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('uppercase');
    });

    it('should reject passwords without lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'UPPERCASE123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('lowercase');
    });

    it('should reject passwords without numbers', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'NoNumbers',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('number');
    });

    it('should reject duplicate email registration', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing-user', email: 'existing@example.com' }]),
          }),
        }),
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'ValidPass123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already registered');
    });
  });

  describe('POST /api/auth/signin', () => {
    beforeEach(() => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'user-123',
              email: 'test@example.com',
              passwordHash: 'hashed_password',
            }]),
          }),
        }),
      });
    });

    it('should sign in with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
    });

    it('should reject non-existent email', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'ValidPass123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'invalid-email',
          password: 'ValidPass123',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/signout', () => {
    it('should clear session on signout', async () => {
      const response = await request(app)
        .post('/api/auth/signout')
        .set('Authorization', 'Bearer mock_token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should work even without a token', async () => {
      const response = await request(app)
        .post('/api/auth/signout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/user', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/user');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Not authenticated');
    });
  });
});
