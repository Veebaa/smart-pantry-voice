import { beforeAll, afterAll, afterEach } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
});

afterEach(() => {
});

afterAll(() => {
});
