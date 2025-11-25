import { pgTable, text, uuid, timestamp, integer, doublePrecision, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const pantryItems = pgTable("pantry_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().$type<'fridge' | 'freezer' | 'cupboard' | 'pantry_staples'>(),
  quantity: text("quantity"),
  currentQuantity: doublePrecision("current_quantity"),
  lowStockThreshold: doublePrecision("low_stock_threshold"),
  isLow: boolean("is_low").default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertPantryItemSchema = createInsertSchema(pantryItems).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
});
export type InsertPantryItem = z.infer<typeof insertPantryItemSchema>;
export type PantryItem = typeof pantryItems.$inferSelect;

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  dietaryRestrictions: text("dietary_restrictions").array().default([]),
  householdSize: integer("household_size").default(2),
  voiceLanguage: text("voice_language").default("en"),
  voiceAccent: text("voice_accent").default("en-US"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

export const favoriteRecipes = pgTable("favorite_recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  recipeName: text("recipe_name").notNull(),
  recipeData: jsonb("recipe_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertFavoriteRecipeSchema = createInsertSchema(favoriteRecipes).omit({
  id: true,
  createdAt: true,
});
export type InsertFavoriteRecipe = z.infer<typeof insertFavoriteRecipeSchema>;
export type FavoriteRecipe = typeof favoriteRecipes.$inferSelect;

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Shopping list items (separate from pantry - for items user needs to buy)
export const shoppingListItems = pgTable("shopping_list_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  checked: boolean("checked").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({
  id: true,
  createdAt: true,
});
export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;

// Recipe history - track which recipes have been made
export const recipeHistory = pgTable("recipe_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  recipeName: text("recipe_name").notNull(),
  recipeData: jsonb("recipe_data").notNull(),
  rating: integer("rating"), // 1-5 stars
  notes: text("notes"),
  madeAt: timestamp("made_at", { withTimezone: true }).defaultNow(),
});

export const insertRecipeHistorySchema = createInsertSchema(recipeHistory).omit({
  id: true,
  madeAt: true,
});
export type InsertRecipeHistory = z.infer<typeof insertRecipeHistorySchema>;
export type RecipeHistory = typeof recipeHistory.$inferSelect;

// Action history for undo functionality
export const actionHistory = pgTable("action_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  actionType: text("action_type").notNull().$type<'add_item' | 'delete_item' | 'update_item' | 'add_shopping' | 'delete_shopping'>(),
  entityType: text("entity_type").notNull().$type<'pantry_item' | 'shopping_list_item'>(),
  entityId: uuid("entity_id").notNull(),
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  actionGroupId: uuid("action_group_id"), // Groups batch operations together
  undoneAt: timestamp("undone_at", { withTimezone: true }), // Null = not undone, set = when it was undone
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertActionHistorySchema = createInsertSchema(actionHistory).omit({
  id: true,
  createdAt: true,
  undoneAt: true,
});
export type InsertActionHistory = z.infer<typeof insertActionHistorySchema>;
export type ActionHistory = typeof actionHistory.$inferSelect;
