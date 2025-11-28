/**
 * Comprehensive Input Validation Schemas
 * Using Zod for runtime schema validation and type safety
 * Implements OWASP input validation best practices
 */

import { z } from "zod";
import { sanitizeEmail, sanitizeString } from "./security.js";

// ============================================================================
// 🔐 AUTHENTICATION VALIDATION
// ============================================================================

/**
 * Email validation schema
 * - Must be valid email format
 * - Sanitized to prevent injection attacks
 * - Max length to prevent DoS attacks
 */
export const emailSchema = z
  .string("Email is required")
  .email("Invalid email format")
  .max(254, "Email must be less than 254 characters")
  .transform(sanitizeEmail);

/**
 * Password validation schema
 * Security requirements:
 * - Minimum 8 characters (prevents weak passwords)
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - Max 128 characters (prevents buffer overflow issues)
 */
export const passwordSchema = z
  .string("Password is required")
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/**
 * Signup validation schema
 * Combines email and password validation with confirmation
 */
export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string("Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Signin validation schema
 * Basic email/password validation
 */
export const signinSchema = z.object({
  email: emailSchema,
  password: z.string("Password is required"),
});

export type SigninInput = z.infer<typeof signinSchema>;

// ============================================================================
// 📦 PANTRY ITEMS VALIDATION
// ============================================================================

/**
 * Item name validation
 * - Required, non-empty string
 * - Sanitized to prevent XSS
 * - Length limits prevent storage abuse
 */
export const itemNameSchema = z
  .string("Item name is required")
  .min(1, "Item name cannot be empty")
  .max(100, "Item name must be less than 100 characters")
  .transform(sanitizeString);

/**
 * Quantity validation
 * - Must be positive number
 * - Max value prevents integer overflow
 */
export const quantitySchema = z
  .number("Quantity must be a number")
  .positive("Quantity must be positive")
  .max(999999, "Quantity must be less than 999,999");

/**
 * Unit of measurement validation
 */
export const unitSchema = z
  .enum(["g", "kg", "ml", "l", "count", "oz", "lb", "cup", "tbsp", "tsp"])
  .optional();

/**
 * Category validation
 * Must be from predefined categories to prevent invalid data
 */
export const categorySchema = z.enum([
  "fridge",
  "freezer",
  "cupboard",
  "pantry_staples",
  "unknown",
]);

/**
 * Pantry item creation schema
 */
export const createPantryItemSchema = z.object({
  name: itemNameSchema,
  quantity: quantitySchema,
  unit: unitSchema,
  category: categorySchema,
  expiryDate: z.string().datetime().optional(),
  notes: z
    .string()
    .max(500, "Notes must be less than 500 characters")
    .transform(sanitizeString)
    .optional(),
});

export type CreatePantryItemInput = z.infer<typeof createPantryItemSchema>;

/**
 * Pantry item update schema
 * All fields optional - client sends only changed fields
 */
export const updatePantryItemSchema = createPantryItemSchema.partial();

export type UpdatePantryItemInput = z.infer<typeof updatePantryItemSchema>;

// ============================================================================
// ⚙️ USER SETTINGS VALIDATION
// ============================================================================

/**
 * Dietary restriction schema
 */
export const dietaryRestrictionsSchema = z.array(
  z.enum([
    "vegetarian",
    "vegan",
    "gluten_free",
    "dairy_free",
    "nut_free",
    "halal",
    "kosher",
  ])
);

/**
 * Household size validation
 * - Must be positive integer
 * - Reasonable upper limit
 */
export const householdSizeSchema = z
  .number("Household size must be a number")
  .int("Household size must be a whole number")
  .min(1, "Household size must be at least 1")
  .max(20, "Household size must be 20 or less");

/**
 * User settings schema
 */
export const userSettingsSchema = z
  .object({
    householdSize: householdSizeSchema.optional(),
    dietaryRestrictions: dietaryRestrictionsSchema.optional(),
    lowStockThreshold: z
      .number()
      .int()
      .min(0)
      .max(100, "Threshold must be 100 or less")
      .optional(),
  })
  .strict(); // Reject unknown fields

export type UserSettingsInput = z.infer<typeof userSettingsSchema>;

// ============================================================================
// 🍖 RECIPE VALIDATION
// ============================================================================

/**
 * Recipe title validation
 */
export const recipeTitleSchema = z
  .string("Recipe title is required")
  .min(1, "Recipe title cannot be empty")
  .max(200, "Recipe title must be less than 200 characters")
  .transform(sanitizeString);

/**
 * Recipe data schema
 */
export const recipeSchema = z.object({
  title: recipeTitleSchema,
  ingredients: z.array(z.string()).optional(),
  instructions: z
    .string()
    .max(2000, "Instructions must be less than 2000 characters")
    .optional(),
});

export type RecipeInput = z.infer<typeof recipeSchema>;

/**
 * Recipe rating validation (1-5 stars)
 */
export const ratingSchema = z
  .number()
  .int()
  .min(1, "Rating must be at least 1")
  .max(5, "Rating must be at most 5");

// ============================================================================
// 🛒 SHOPPING LIST VALIDATION
// ============================================================================

/**
 * Shopping list item schema
 */
export const shoppingListItemSchema = z.object({
  itemName: itemNameSchema,
  quantity: quantitySchema,
  unit: unitSchema,
  checked: z.boolean().default(false),
});

export type ShoppingListItemInput = z.infer<typeof shoppingListItemSchema>;

// ============================================================================
// 🎫 CSRF TOKEN VALIDATION
// ============================================================================

/**
 * CSRF token schema
 * Must be 64-character hex string (32 bytes * 2)
 */
export const csrfTokenSchema = z
  .string("CSRF token is required")
  .regex(/^[a-f0-9]{64}$/, "Invalid CSRF token format");

// ============================================================================
// 🔑 PAGINATION VALIDATION
// ============================================================================

/**
 * Pagination parameters
 * Prevents retrieval of excessive data
 */
export const paginationSchema = z.object({
  page: z
    .number()
    .int()
    .positive()
    .default(1),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ============================================================================
// ✅ UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely parse and validate user input
 * Returns parsed data or null if validation fails
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn("[validation] Validation error:", error.issues);
    }
    return null;
  }
}

/**
 * Get first validation error message
 * Useful for client-facing error responses
 */
export function getValidationError(
  schema: z.ZodSchema,
  data: unknown
): string | null {
  try {
    schema.parse(data);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || "Validation failed";
    }
    return "Validation failed";
  }
}
