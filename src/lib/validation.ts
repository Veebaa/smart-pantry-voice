import { z } from 'zod';

/**
 * Security: Input validation schemas using zod to prevent injection attacks
 * and ensure data integrity across the application.
 */

// Auth validation schemas
export const authSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" })
    .refine((email) => {
      // Additional email validation: prevent common injection patterns
      const dangerousPatterns = /<|>|javascript:|onerror=|onclick=/i;
      return !dangerousPatterns.test(email);
    }, { message: "Invalid email format" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(128, { message: "Password must be less than 128 characters" })
    .refine((password) => {
      // Password strength: require at least one uppercase, one lowercase, one number
      return /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
    }, { message: "Password must contain uppercase, lowercase, and number" })
});

// Settings validation schemas
export const settingsSchema = z.object({
  householdSize: z
    .number()
    .int({ message: "Household size must be a whole number" })
    .min(1, { message: "Household size must be at least 1" })
    .max(20, { message: "Household size must be 20 or less" }),
  dietaryRestrictions: z
    .array(z.string())
    .max(10, { message: "Too many dietary restrictions selected" })
    .refine((items) => {
      // Validate each item is from allowed list
      const allowed = ["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-free", "low-carb", "keto"];
      return items.every(item => allowed.includes(item));
    }, { message: "Invalid dietary restriction" }),
  voiceLanguage: z
    .string()
    .max(10, { message: "Language code too long" })
    .regex(/^[a-z]{2}$/, { message: "Invalid language code" }),
  voiceAccent: z
    .string()
    .max(10, { message: "Accent code too long" })
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, { message: "Invalid accent code" })
});

// Voice input validation
export const voiceInputSchema = z
  .string()
  .trim()
  .min(1, { message: "Voice input cannot be empty" })
  .max(500, { message: "Voice input must be less than 500 characters" })
  .refine((text) => {
    // Prevent script injection attempts in voice input
    const dangerousPatterns = /<script|javascript:|onerror=|onclick=|<iframe/i;
    return !dangerousPatterns.test(text);
  }, { message: "Invalid input detected" });

// Pantry item validation
export const pantryItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Item name is required" })
    .max(100, { message: "Item name must be less than 100 characters" })
    .refine((name) => {
      // Prevent XSS in item names
      const xssPatterns = /<|>|&lt;|&gt;|javascript:|onerror=/i;
      return !xssPatterns.test(name);
    }, { message: "Invalid characters in item name" }),
  category: z
    .string()
    .refine((cat) => ["fridge", "freezer", "cupboard", "pantry_staples"].includes(cat), {
      message: "Invalid category"
    }),
  quantity: z
    .string()
    .max(50, { message: "Quantity must be less than 50 characters" })
    .optional()
    .nullable(),
  current_quantity: z
    .number()
    .min(0, { message: "Quantity cannot be negative" })
    .max(10000, { message: "Quantity too large" })
    .optional()
    .nullable(),
  low_stock_threshold: z
    .number()
    .min(0, { message: "Threshold cannot be negative" })
    .max(10000, { message: "Threshold too large" })
    .optional()
    .nullable()
});

/**
 * Sanitize HTML content to prevent XSS attacks
 * Use this when displaying user-generated or AI-generated content
 */
export const sanitizeHtml = (html: string): string => {
  // Basic HTML entity encoding
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate and sanitize text content
 * Use this for displaying text that might contain user input
 */
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .slice(0, 1000) // Limit length
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};
