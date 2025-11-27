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

const mockPantryItem = {
  id: 'item-123',
  userId: 'user-123',
  name: 'Milk',
  category: 'fridge',
  quantity: '1 gallon',
  currentQuantity: 1,
  lowStockThreshold: 1,
  isLow: false,
  expiresAt: null,
  addedAt: new Date(),
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

describe('Pantry API Integration Tests', () => {
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

  const setupAuthenticatedRequest = () => {
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
        if (table?.name === 'pantry_items' || table?._?.name === 'pantry_items') {
          return {
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([mockPantryItem]),
            }),
          };
        }
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        };
      }),
    }));
  };

  describe('GET /api/pantry-items', () => {
    it('should return 401 without authentication', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const response = await request(app).get('/api/pantry-items');

      expect(response.status).toBe(401);
    });

    it('should return pantry items for authenticated user', async () => {
      setupAuthenticatedRequest();

      const response = await request(app)
        .get('/api/pantry-items')
        .set('Authorization', 'Bearer valid_session_token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/pantry-items', () => {
    beforeEach(() => {
      setupAuthenticatedRequest();
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPantryItem]),
        }),
      });
    });

    it('should create a new pantry item', async () => {
      const response = await request(app)
        .post('/api/pantry-items')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          name: 'Milk',
          category: 'fridge',
          quantity: '1 gallon',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Milk');
    });

    it('should reject invalid category', async () => {
      const response = await request(app)
        .post('/api/pantry-items')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          name: 'Test Item',
          category: 'invalid_category',
        });

      expect(response.status).toBe(400);
    });

    it('should require name field', async () => {
      const response = await request(app)
        .post('/api/pantry-items')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          category: 'fridge',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/pantry-items/:id', () => {
    beforeEach(() => {
      setupAuthenticatedRequest();
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockPantryItem, name: 'Updated Milk' }]),
          }),
        }),
      });
    });

    it('should update a pantry item', async () => {
      const response = await request(app)
        .patch('/api/pantry-items/item-123')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          name: 'Updated Milk',
        });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent item', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const response = await request(app)
        .patch('/api/pantry-items/nonexistent-id')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          name: 'Updated Milk',
        });

      expect(response.status).toBe(404);
    });

    it('should validate category updates', async () => {
      const response = await request(app)
        .patch('/api/pantry-items/item-123')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          category: 'invalid_category',
        });

      expect(response.status).toBe(400);
    });

    it('should handle expiration date updates', async () => {
      const response = await request(app)
        .patch('/api/pantry-items/item-123')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          expiresAt: '2025-12-31T00:00:00.000Z',
        });

      expect(response.status).toBe(200);
    });

    it('should allow clearing expiration date', async () => {
      const response = await request(app)
        .patch('/api/pantry-items/item-123')
        .set('Authorization', 'Bearer valid_session_token')
        .send({
          expiresAt: null,
        });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/pantry-items/:id', () => {
    beforeEach(() => {
      setupAuthenticatedRequest();
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
    });

    it('should delete a pantry item', async () => {
      const response = await request(app)
        .delete('/api/pantry-items/item-123')
        .set('Authorization', 'Bearer valid_session_token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
