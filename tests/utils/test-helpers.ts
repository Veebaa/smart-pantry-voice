import { vi } from 'vitest';

export function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    query: {},
    cookies: {},
    headers: {},
    ...overrides,
  };
}

export function createMockResponse() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

export function createMockNext() {
  return vi.fn();
}

export async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateValidPassword(): string {
  return 'ValidPass123';
}

export function generateInvalidPassword(): string {
  return 'short';
}

export function generateValidEmail(): string {
  return 'valid@example.com';
}

export function generateInvalidEmail(): string {
  return 'invalid-email';
}
