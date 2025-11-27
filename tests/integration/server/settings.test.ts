import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  passwordHash: 'hashed',
  createdAt: new Date(),
};

const mockSession = {
  id: 'session-123',
  userId: 'user-123',
  token: 'valid_session_token',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
};

const mockSettings = {
  id: 'settings-123',
  userId: 'user-123',
  householdSize: 4,
  dietaryRestrictions: ['vegetarian', 'gluten-free'],
  voiceLanguage: 'en',
  voiceAccent: 'en-US',
  createdAt: new Date(),
  updatedAt: new Date(),
};

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
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockReturnValue({
    toString: () => 'mock_session_token',
  }),
  randomUUID: vi.fn().mockReturnValue('mock-uuid'),
}));

describe('User Settings API Integration Tests', () => {
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
  });

  const setupAuthenticatedRequest = (hasSettings = true) => {
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation((table: any) => {
        if (table?.name === 'sessions' || table?._?.name === 'sessions') {
          return {
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockSession]),
            }),
          };
        }
        if (table?.name === 'users' || table?._?.name === 'users') {
          return {
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser]),
            }),
          };
        }
        if (table?.name === 'user_settings' || table?._?.name === 'user_settings') {
          return {
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(hasSettings ? [mockSettings] : []),
            }),
          };
        }
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        };
      }),
    }));
  };

  describe('GET /api/user-settings', () => {
    it('should return 401 without authentication', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const response = await request(app).get('/api/user-settings');

      expect(response.status).toBe(401);
    });

    it('should return user settings', async () => {
      setupAuthenticatedRequest(true);

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer valid_session_token');

      expect(response.status).toBe(200);
      expect(response.body.householdSize).toBe(4);
      expect(response.body.dietaryRestrictions).toContain('vegetarian');
    });

    it('should return null if no settings exist', async () => {
      setupAuthenticatedRequest(false);

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer valid_session_token');

      expect(response.status).toBe(200);
      expect(response.body).toBe(null);
    });
  });

  describe('POST /api/user-settings', () => {
    beforeEach(() => {
      setupAuthenticatedRequest(false);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSettings]),
        }),
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockSettings]),
          }),
        }),
      });
    });

    it('should create new settings', async () => {
      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          householdSize: 4,
          dietaryRestrictions: ['vegetarian'],
          voiceLanguage: 'en',
          voiceAccent: 'en-US',
        });

      expect(response.status).toBe(200);
    });

    it('should update existing settings', async () => {
      setupAuthenticatedRequest(true);

      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          householdSize: 5,
          dietaryRestrictions: ['vegan'],
        });

      expect(response.status).toBe(200);
    });

    it('should accept dietary restrictions array', async () => {
      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          dietaryRestrictions: ['vegetarian', 'gluten-free', 'dairy-free'],
        });

      expect(response.status).toBe(200);
    });

    it('should accept household size', async () => {
      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          householdSize: 6,
        });

      expect(response.status).toBe(200);
    });
  });
});
