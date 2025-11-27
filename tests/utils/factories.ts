import type { InsertUser, InsertPantryItem, InsertUserSettings, InsertFavoriteRecipe, InsertRecipeHistory } from '../../shared/schema';

let userIdCounter = 1;
let itemIdCounter = 1;

export function createTestUser(overrides: Partial<InsertUser> = {}): InsertUser {
  const id = userIdCounter++;
  return {
    email: `testuser${id}@example.com`,
    passwordHash: '$2a$10$hashedpassword123',
    ...overrides,
  };
}

export function createTestPantryItem(userId: string, overrides: Partial<InsertPantryItem> = {}): InsertPantryItem {
  const id = itemIdCounter++;
  return {
    userId,
    name: `Test Item ${id}`,
    category: 'fridge',
    quantity: '1',
    currentQuantity: 1,
    lowStockThreshold: 1,
    isLow: false,
    ...overrides,
  };
}

export function createTestUserSettings(userId: string, overrides: Partial<InsertUserSettings> = {}): InsertUserSettings {
  return {
    userId,
    householdSize: 2,
    dietaryRestrictions: [],
    voiceLanguage: 'en',
    voiceAccent: 'en-US',
    ...overrides,
  };
}

export function createTestFavoriteRecipe(userId: string, overrides: Partial<InsertFavoriteRecipe> = {}): InsertFavoriteRecipe {
  return {
    userId,
    recipeName: 'Test Recipe',
    recipeData: { ingredients: ['ingredient1'], steps: ['step1'] },
    ...overrides,
  };
}

export function createTestRecipeHistory(userId: string, overrides: Partial<InsertRecipeHistory> = {}): InsertRecipeHistory {
  return {
    userId,
    recipeName: 'Cooked Recipe',
    recipeData: { ingredients: ['ingredient1'], steps: ['step1'] },
    ...overrides,
  };
}

export function resetCounters() {
  userIdCounter = 1;
  itemIdCounter = 1;
}
