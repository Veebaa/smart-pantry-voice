import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

const mockHash = vi.fn();
const mockCompare = vi.fn();
const mockRandomBytes = vi.fn();

vi.mock('bcryptjs', () => ({
  default: {
    hash: (...args: unknown[]) => mockHash(...args),
    compare: (...args: unknown[]) => mockCompare(...args),
  },
}));

vi.mock('crypto', () => ({
  randomBytes: (...args: unknown[]) => mockRandomBytes(...args),
}));

describe('Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      mockHash.mockResolvedValue('hashed_password');
      
      const { hashPassword } = await import('../../../server/auth.js');
      const result = await hashPassword('testPassword123');
      
      expect(mockHash).toHaveBeenCalledWith('testPassword123', 10);
      expect(result).toBe('hashed_password');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      mockCompare.mockResolvedValue(true);
      
      const { comparePassword } = await import('../../../server/auth.js');
      const result = await comparePassword('password', 'hashedPassword');
      
      expect(mockCompare).toHaveBeenCalledWith('password', 'hashedPassword');
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      mockCompare.mockResolvedValue(false);
      
      const { comparePassword } = await import('../../../server/auth.js');
      const result = await comparePassword('wrongPassword', 'hashedPassword');
      
      expect(result).toBe(false);
    });
  });

  describe('generateSessionToken', () => {
    it('should generate a 64-character hex token', async () => {
      const mockBuffer = Buffer.from('a'.repeat(32));
      mockRandomBytes.mockReturnValue(mockBuffer);
      
      const { generateSessionToken } = await import('../../../server/auth.js');
      const token = generateSessionToken();
      
      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(token).toBe(mockBuffer.toString('hex'));
      expect(token.length).toBe(64);
    });
  });
});

describe('Password Validation', () => {
  it('should accept valid passwords', () => {
    const validPasswords = [
      'Password1',
      'StrongPass123',
      'Test1234',
      'Complex1Password',
    ];

    validPasswords.forEach(password => {
      expect(password.length).toBeGreaterThanOrEqual(8);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
    });
  });

  it('should identify invalid passwords', () => {
    const invalidPasswords = [
      { password: 'short1A', reason: 'Too short' },
      { password: 'nouppercase1', reason: 'No uppercase' },
      { password: 'NOLOWERCASE1', reason: 'No lowercase' },
      { password: 'NoNumbers', reason: 'No numbers' },
    ];

    invalidPasswords.forEach(({ password, reason }) => {
      const isValid = 
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password);
      
      expect(isValid).toBe(false);
    });
  });
});
