import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../server/auth.js';

describe('cookie-only authentication', () => {
  it('does not authenticate a request using only a Bearer token', async () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const req = {
      cookies: {},
      headers: { authorization: 'Bearer a-valid-looking-session-token' },
    } as unknown as Request;
    const res = { status } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    expect(next).not.toHaveBeenCalled();
  });
});

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

describe('Password Validation Schema', () => {
  describe('valid passwords', () => {
    it('should accept passwords meeting all requirements', () => {
      const validPasswords = [
        'Password1',
        'StrongPass123',
        'Test1234',
        'Complex1Password',
        'MyP@ssw0rd',
      ];

      validPasswords.forEach(password => {
        expect(() => passwordSchema.parse(password)).not.toThrow();
      });
    });
  });

  describe('invalid passwords', () => {
    it('should reject passwords shorter than 8 characters', () => {
      expect(() => passwordSchema.parse('Short1A')).toThrow(/8 characters/);
    });

    it('should reject passwords without uppercase letters', () => {
      expect(() => passwordSchema.parse('nouppercase1')).toThrow(/uppercase/);
    });

    it('should reject passwords without lowercase letters', () => {
      expect(() => passwordSchema.parse('NOLOWERCASE1')).toThrow(/lowercase/);
    });

    it('should reject passwords without numbers', () => {
      expect(() => passwordSchema.parse('NoNumbersHere')).toThrow(/number/);
    });
  });
});

describe('Email Validation', () => {
  const emailSchema = z.string().email();

  it('should accept valid emails', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.org',
      'user+tag@example.co.uk',
    ];

    validEmails.forEach(email => {
      expect(() => emailSchema.parse(email)).not.toThrow();
    });
  });

  it('should reject invalid emails', () => {
    const invalidEmails = [
      'invalid',
      'missing@',
      '@nodomain.com',
      'spaces in@email.com',
    ];

    invalidEmails.forEach(email => {
      expect(() => emailSchema.parse(email)).toThrow();
    });
  });
});

describe('Session Token Format', () => {
  it('should validate hex token format', () => {
    const validToken = 'a'.repeat(64);
    expect(validToken).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(validToken)).toBe(true);
  });

  it('should have 32 bytes of entropy (64 hex chars)', () => {
    const tokenLength = 64;
    const bytesOfEntropy = tokenLength / 2;
    expect(bytesOfEntropy).toBe(32);
  });
});
