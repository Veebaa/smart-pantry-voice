import { Router } from "express";
import { db } from "./db";
import { pantryItems, userSettings, favoriteRecipes, users, sessions, shoppingListItems, insertPantryItemSchema, insertUserSettingsSchema, insertFavoriteRecipeSchema, insertShoppingListItemSchema } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, hashPassword, comparePassword, createSession } from "./auth";
import { z } from "zod";
import { classifyItem, formatClarificationQuestion, getClassificationForAI } from "./itemClassifier";

const router = Router();

// Auth routes
router.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const authSchema = z.object({
      email: z.string().email(),
      password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    });
    
    const validatedData = authSchema.parse({ email, password });
    
    const existingUser = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    const passwordHash = await hashPassword(validatedData.password);
    const [user] = await db.insert(users).values({
      email: validatedData.email,
      passwordHash,
    }).returning();
    
    const session = await createSession(user.id);
    
    res.json({ user: { id: user.id, email: user.email }, token: session.token });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const authSchema = z.object({
      email: z.string().email(),
      password: z.string(),
    });
    
    const validatedData = authSchema.parse({ email, password });
    
    const [user] = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    const isValid = await comparePassword(validatedData.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    const session = await createSession(user.id);
    
    res.json({ user: { id: user.id, email: user.email }, token: session.token });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/auth/signout", async (req, res) => {
  // Get token from Authorization header or cookie
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  
  if (!token) {
    token = req.cookies.session_token;
  }
  
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  res.clearCookie("session_token");
  res.json({ success: true });
});

router.get("/api/auth/user", requireAuth, async (req, res) => {
  res.json({ user: { id: req.user!.id, email: req.user!.email } });
});

// Pantry Items routes
router.get("/api/pantry-items", requireAuth, async (req, res) => {
  try {
    const items = await db.select().from(pantryItems)
      .where(eq(pantryItems.userId, req.user!.id))
      .orderBy(desc(pantryItems.addedAt));
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/pantry-items", requireAuth, async (req, res) => {
  try {
    const validatedData = insertPantryItemSchema.parse({ ...req.body, userId: req.user!.id });
    const [item] = await db.insert(pantryItems).values(validatedData as any).returning();
    res.json(item);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/pantry-items/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const updateSchema = z.object({
      name: z.string().optional(),
      category: z.enum(["fridge", "freezer", "cupboard", "pantry_staples"]).optional(),
      quantity: z.string().optional(),
      isLow: z.boolean().optional(),
      currentQuantity: z.number().optional(),
      lowStockThreshold: z.number().optional(),
    });
    
    const validatedData = updateSchema.parse(req.body);
    
    const [item] = await db.update(pantryItems)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, req.user!.id)))
      .returning();
    
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    
    res.json(item);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/pantry-items/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(pantryItems)
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, req.user!.id)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// User Settings routes
router.get("/api/user-settings", requireAuth, async (req, res) => {
  try {
    const [settings] = await db.select().from(userSettings)
      .where(eq(userSettings.userId, req.user!.id))
      .limit(1);
    res.json(settings || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/user-settings", requireAuth, async (req, res) => {
  try {
    const validatedData = insertUserSettingsSchema.parse({ ...req.body, userId: req.user!.id });
    
    const [existing] = await db.select().from(userSettings)
      .where(eq(userSettings.userId, req.user!.id))
      .limit(1);
    
    let settings;
    if (existing) {
      [settings] = await db.update(userSettings)
        .set({ ...validatedData, updatedAt: new Date() } as any)
        .where(eq(userSettings.userId, req.user!.id))
        .returning();
    } else {
      [settings] = await db.insert(userSettings).values(validatedData as any).returning();
    }
    
    res.json(settings);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Favorite Recipes routes
router.get("/api/favorite-recipes", requireAuth, async (req, res) => {
  try {
    const recipes = await db.select().from(favoriteRecipes)
      .where(eq(favoriteRecipes.userId, req.user!.id))
      .orderBy(desc(favoriteRecipes.createdAt));
    res.json(recipes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/favorite-recipes", requireAuth, async (req, res) => {
  try {
    const { recipeName, recipeData } = req.body;
    
    if (!recipeName) {
      return res.status(400).json({ error: "Recipe name is required" });
    }
    
    // Ensure recipeData has proper structure with defaults - handle all possible undefined cases
    const safeRecipeData = recipeData || {};
    const safeRecipe = safeRecipeData.recipe || {};
    
    const sanitizedRecipeData = {
      ingredients_available: Array.isArray(safeRecipeData.ingredients_available) 
        ? safeRecipeData.ingredients_available.filter((i: any) => i != null) 
        : [],
      ingredients_needed: Array.isArray(safeRecipeData.ingredients_needed) 
        ? safeRecipeData.ingredients_needed.filter((i: any) => i != null) 
        : [],
      recipe: {
        ingredients_with_quantities: Array.isArray(safeRecipe.ingredients_with_quantities) 
          ? safeRecipe.ingredients_with_quantities.filter((i: any) => i != null) 
          : [],
        cooking_steps: Array.isArray(safeRecipe.cooking_steps) 
          ? safeRecipe.cooking_steps.filter((s: any) => s != null) 
          : [],
        tips: typeof safeRecipe.tips === 'string' ? safeRecipe.tips : ""
      }
    };
    
    const [recipe] = await db.insert(favoriteRecipes).values({
      recipeName,
      recipeData: sanitizedRecipeData,
      userId: req.user!.id 
    }).returning();
    res.json(recipe);
  } catch (error: any) {
    console.error("Error saving favorite recipe:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/favorite-recipes/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(favoriteRecipes)
      .where(and(eq(favoriteRecipes.id, id), eq(favoriteRecipes.userId, req.user!.id)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Shopping List routes (for items to buy, separate from pantry)
router.get("/api/shopping-list", requireAuth, async (req, res) => {
  try {
    const items = await db.select().from(shoppingListItems)
      .where(eq(shoppingListItems.userId, req.user!.id))
      .orderBy(desc(shoppingListItems.createdAt));
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/shopping-list", requireAuth, async (req, res) => {
  try {
    const { name, quantity } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Item name is required" });
    }
    
    const [item] = await db.insert(shoppingListItems).values({
      userId: req.user!.id,
      name,
      quantity: quantity || null,
      checked: false,
    }).returning();
    
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/shopping-list/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { checked, name, quantity } = req.body;
    
    const updateData: any = {};
    if (checked !== undefined) updateData.checked = checked;
    if (name !== undefined) updateData.name = name;
    if (quantity !== undefined) updateData.quantity = quantity;
    
    const [item] = await db.update(shoppingListItems)
      .set(updateData)
      .where(and(eq(shoppingListItems.id, id), eq(shoppingListItems.userId, req.user!.id)))
      .returning();
    
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/shopping-list/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(shoppingListItems)
      .where(and(eq(shoppingListItems.id, id), eq(shoppingListItems.userId, req.user!.id)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Assistant routes
router.post("/api/pantry-assistant", requireAuth, async (req, res) => {
  try {
    const {
      voiceInput,
      dietaryRestrictions,
      householdSize,
      recipeFilters,
      lastItem,
      userAnswer,
      pending_item,
    } = req.body;

    const categories = ["fridge", "freezer", "cupboard", "pantry_staples"];

    // Handle follow-up category answer for ambiguous items
    if (pending_item && userAnswer) {
      const normalizedCategory = categories.find(cat =>
        userAnswer.toLowerCase().includes(cat) || 
        (cat === 'pantry_staples' && (userAnswer.toLowerCase().includes('staples') || userAnswer.toLowerCase().includes('pantry')))
      );

      if (normalizedCategory) {
        await db.insert(pantryItems).values({
          userId: req.user!.id,
          name: pending_item,
          category: normalizedCategory as any,
          quantity: "unknown",
          isLow: false,
        });

        const displayCategory = normalizedCategory === 'pantry_staples' ? 'pantry staples' : normalizedCategory;
        return res.json({
          action: "add_item",
          payload: {
            items: [{ name: pending_item, category: normalizedCategory, quantity: "unknown", is_low: false }]
          },
          speak: `Lovely! I've added ${pending_item} to your ${displayCategory}.`
        });
      }
    }

    // SMART CLASSIFICATION: Use intelligent categorization for pending items
    if (pending_item) {
      // Fetch current pantry items first to check for duplicates
      const existingPantryItems = await db.select().from(pantryItems)
        .where(eq(pantryItems.userId, req.user!.id));
      
      // Check for duplicate
      const existingItem = existingPantryItems.find(
        p => p.name.toLowerCase() === pending_item.toLowerCase()
      );
      
      if (existingItem) {
        const displayCategory = existingItem.category === 'pantry_staples' ? 'pantry staples' : existingItem.category;
        return res.json({
          action: "none",
          payload: {},
          speak: `${pending_item} is already in your ${displayCategory}.`
        });
      }
      
      const classification = classifyItem(pending_item);
      
      // If we can classify it automatically, do so
      if (classification.category && !classification.isAmbiguous) {
        await db.insert(pantryItems).values({
          userId: req.user!.id,
          name: pending_item,
          category: classification.category as any,
          quantity: "unknown",
          isLow: false,
        });

        const displayCategory = classification.category === 'pantry_staples' ? 'pantry staples' : classification.category;
        return res.json({
          action: "add_item",
          payload: {
            items: [{ name: pending_item, category: classification.category, quantity: "unknown", is_low: false }]
          },
          speak: `Added ${pending_item} to the ${displayCategory}.`
        });
      }
      
      // If it's ambiguous, ask the user
      if (classification.isAmbiguous && classification.possibleCategories) {
        return res.json({
          action: "ask",
          payload: {
            pending_item: pending_item
          },
          speak: formatClarificationQuestion(pending_item, classification.possibleCategories)
        });
      }
    }

    // Fetch current pantry items
    const currentPantryItems = await db.select().from(pantryItems)
      .where(eq(pantryItems.userId, req.user!.id));

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
    }

    // Get low stock items for shopping list
    const lowStockItems = currentPantryItems.filter(item => 
      item.isLow || (item.currentQuantity != null && item.lowStockThreshold != null && 
        Number(item.currentQuantity) <= Number(item.lowStockThreshold))
    );

    const smartCategorizationRules = getClassificationForAI();
    
    const systemPrompt = `You are Sage, the kitchen assistant.
Your job is to interpret the user's speech text, determine their intent, and return a JSON action.

${smartCategorizationRules}

CRITICAL COMMAND INTERPRETATION:
- "add X" or "I have X" or "got X" = ADD TO PANTRY (action="add_item")
- "add X to shopping list" or "add X to the list" or "I need to buy X" = ADD TO SHOPPING LIST (action="add_to_shopping_list")
- "suggest meals" or "what can I cook" = SUGGEST MEALS (action="suggest_meals")

RULES FOR ADDING ITEMS:
1. ADDING TO PANTRY (DEFAULT FOR "add X"): When user says "add X", "I have X", "got X", "put X in the pantry":
   - This means add to PANTRY INVENTORY, NOT shopping list
   - FIRST, apply the SMART ITEM CATEGORIZATION RULES above
   - If the item can be auto-classified (has keywords like "frozen", "tinned", "fresh", OR is a known item like cheese, milk, ice cream, corn flakes, pasta), set action="add_item" with the correct category - DO NOT ASK
   - ONLY if the item is genuinely ambiguous (like "fish", "peas", "bread" without modifiers), set action="ask" with pending_item
   - EXAMPLES:
     * "add cheese" → action="add_item", category="fridge" 
     * "add ice cream" or "add ice-cream" → action="add_item", category="freezer"
     * "add corn flakes" → action="add_item", category="cupboard"
     * "add frozen peas" → action="add_item", category="freezer"
     * "add fish" → action="ask", pending_item="fish" (ambiguous without modifier)

2. If a pending item exists and userAnswer includes a storage category, set action="add_item", add item with that category.

3. If user says "skip", "cancel", "never mind", respond with action="none".

4. MEAL SUGGESTIONS: If user asks for meal suggestions (e.g., "what can I cook", "suggest meals", "recipe ideas", "what should I make"), set action="suggest_meals" and provide 3-4 meal ideas based on pantry items.

5. RUNNING LOW: If user says "running low on X", "low on X", "almost out of X", or "need more X":
   - If item EXISTS in pantry: action="update_item" with is_low=true
   - If item NOT in pantry: action="add_to_shopping_list"

6. ADD TO SHOPPING LIST ONLY: If user EXPLICITLY says "add X to shopping list", "add X to the list", "I need to buy X", "put X on my shopping list":
   - Set action="add_to_shopping_list"
   - This is DIFFERENT from "add X" which adds to pantry

7. GENERATE SHOPPING LIST: If user asks "what do I need", "create shopping list", "what should I buy":
   - Set action="generate_shopping_list"
   - The low stock items are: ${lowStockItems.map(i => i.name).join(", ") || "none currently"}

8. Otherwise, handle normal commands.

CRITICAL: "add X" means add to PANTRY. Only "add X to shopping list" means shopping list. Do NOT confuse these.

When suggesting meals:
- Use action="suggest_meals" 
- Include meal_suggestions array in payload with each meal having: name, ingredients_available (from pantry), ingredients_needed (to buy), and recipe object with ingredients_with_quantities, cooking_steps, and tips
- Consider dietary restrictions and household size
- Prioritize meals that use ingredients already in the pantry

Current pantry inventory:
${JSON.stringify(currentPantryItems, null, 2)}

Items currently marked as low stock:
${lowStockItems.length > 0 ? lowStockItems.map(i => `- ${i.name}`).join("\n") : "None"}

${lastItem ? `PENDING ITEM WAITING FOR CATEGORY: "${lastItem}"` : ''}

Dietary restrictions: ${dietaryRestrictions?.join(", ") || "None"}
Household size: ${householdSize || 2} people
Recipe preferences: ${recipeFilters?.length ? recipeFilters.join(", ") : "No specific preferences"}
`;

    const tools = [
      {
        type: "function",
        function: {
          name: "sage_response",
          description: "Return Sage's action and speech",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["add_item", "update_item", "ask", "none", "suggest_meals", "generate_shopping_list", "add_to_shopping_list"] },
              payload: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        category: { type: "string", enum: categories },
                        quantity: { type: "string" },
                        is_low: { type: "boolean" }
                      }
                    }
                  },
                  pending_item: { type: "string" },
                  shopping_list: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of items to buy (low stock items)"
                  },
                  meal_suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        ingredients_available: { type: "array", items: { type: "string" } },
                        ingredients_needed: { type: "array", items: { type: "string" } },
                        recipe: {
                          type: "object",
                          properties: {
                            ingredients_with_quantities: { type: "array", items: { type: "string" } },
                            cooking_steps: { type: "array", items: { type: "string" } },
                            tips: { type: "string" }
                          }
                        }
                      }
                    }
                  }
                }
              },
              speak: { type: "string" }
            },
            required: ["action", "speak"],
            additionalProperties: false
          }
        }
      }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: voiceInput || "Analyze my pantry and suggest meals" }
        ],
        tools: tools,
        tool_choice: { type: "function", function: { name: "sage_response" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return res.status(500).json({ error: `AI gateway error: ${response.status}` });
    }

    const aiResponse = await response.json() as any;
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return res.status(500).json({ error: "No tool call in AI response" });
    }

    const sageResponse = JSON.parse(toolCall.function.arguments);

    // Compute shopping list updates if meal suggestions exist
    if (sageResponse.payload?.meal_suggestions && Array.isArray(sageResponse.payload.meal_suggestions)) {
      const normalize = (s: any) =>
        (s || "").toString().toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

      const pantryMap = new Map();
      for (const p of currentPantryItems) {
        pantryMap.set(normalize(p.name), p);
      }

      const missing = new Set();
      const low = new Set();

      for (const meal of sageResponse.payload.meal_suggestions) {
        const ingredients: any[] = Array.isArray(meal?.ingredients)
          ? meal.ingredients
          : typeof meal === "object" && typeof meal.description === "string"
          ? meal.description.split(/[,;]\s*/)
          : [];

        for (const ing of ingredients) {
          const ingName = normalize(typeof ing === "string" ? ing : ing?.name || ing?.ingredient || "");
          if (!ingName) continue;

          const matched = pantryMap.get(ingName);
          if (!matched) {
            missing.add(typeof ing === "string" ? ing : ing?.name || JSON.stringify(ing));
          } else {
            const isLow = !!matched.isLow || (
              matched.currentQuantity != null && matched.lowStockThreshold != null &&
              Number(matched.currentQuantity) <= Number(matched.lowStockThreshold)
            );
            if (isLow) low.add(matched.name);
          }
        }
      }

      sageResponse.payload.shoppingListUpdates = {
        missing: Array.from(missing),
        low: Array.from(low),
      };
    }

    // Normalize add_item response - AI sometimes returns flat {name, category} instead of {items: [...]}
    if (sageResponse.action === "add_item" && sageResponse.payload) {
      if (!sageResponse.payload.items && sageResponse.payload.name) {
        // Convert flat format to items array
        sageResponse.payload.items = [{
          name: sageResponse.payload.name,
          category: sageResponse.payload.category,
          quantity: sageResponse.payload.quantity,
          is_low: sageResponse.payload.is_low
        }];
      }
    }

    // Handle add_item in DB - apply smart classification, validate categories, prevent duplicates
    if (sageResponse.action === "add_item" && sageResponse.payload?.items) {
      for (const item of sageResponse.payload.items) {
        if (!item.name) continue;
        
        // Check for duplicate - don't add if item already exists
        const existingItem = currentPantryItems.find(
          p => p.name.toLowerCase() === item.name.toLowerCase()
        );
        
        if (existingItem) {
          // Item already exists, just confirm
          sageResponse.speak = `${item.name} is already in your ${existingItem.category === 'pantry_staples' ? 'pantry staples' : existingItem.category}.`;
          continue;
        }
        
        // Apply smart classification to validate/determine category
        const classification = classifyItem(item.name);
        let category = item.category;
        
        // If classification found a category, use it (override AI if it didn't provide one or provided wrong one)
        if (classification.category && !classification.isAmbiguous) {
          category = classification.category;
        } else if (!category) {
          // No category from AI and couldn't auto-classify
          if (classification.isAmbiguous) {
            // Item is ambiguous - ask user
            sageResponse.action = "ask";
            sageResponse.payload = { pending_item: item.name };
            if (classification.possibleCategories) {
              sageResponse.speak = formatClarificationQuestion(item.name, classification.possibleCategories);
            }
            continue;
          } else {
            // Unknown item - ask user
            sageResponse.action = "ask";
            sageResponse.payload = { pending_item: item.name };
            sageResponse.speak = `I'm not sure where ${item.name} should go. Fridge, freezer, cupboard, or pantry staples?`;
            continue;
          }
        }

        await db.insert(pantryItems).values({
          userId: req.user!.id,
          name: item.name,
          category: category as any,
          quantity: item.quantity || null,
          isLow: item.is_low || false,
        });
        
        // Update speak message to include the actual category used
        const displayCategory = category === 'pantry_staples' ? 'pantry staples' : category;
        if (!sageResponse.speak || sageResponse.speak.includes('added')) {
          sageResponse.speak = `Added ${item.name} to the ${displayCategory}.`;
        }
      }
    }

    // Handle update_item in DB (for low stock updates)
    if (sageResponse.action === "update_item" && sageResponse.payload?.items) {
      for (const item of sageResponse.payload.items) {
        if (!item.name) continue;

        // Find existing item by name (case-insensitive)
        const existingItems = await db.select().from(pantryItems)
          .where(eq(pantryItems.userId, req.user!.id));
        
        const matchingItem = existingItems.find(
          p => p.name.toLowerCase() === item.name.toLowerCase()
        );
        
        if (matchingItem) {
          await db.update(pantryItems)
            .set({ 
              isLow: item.is_low ?? matchingItem.isLow,
              quantity: item.quantity || matchingItem.quantity,
              updatedAt: new Date()
            })
            .where(eq(pantryItems.id, matchingItem.id));
        }
      }
    }

    // Handle add_to_shopping_list in DB (add items directly to shopping list, not pantry)
    if (sageResponse.action === "add_to_shopping_list" && sageResponse.payload?.items) {
      for (const item of sageResponse.payload.items) {
        if (!item.name) continue;

        await db.insert(shoppingListItems).values({
          userId: req.user!.id,
          name: item.name,
          quantity: item.quantity || null,
          checked: false,
        });
      }
    }

    res.json(sageResponse);
  } catch (error: any) {
    console.error("Error in pantry-assistant:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/openai-tts", requireAuth, async (req, res) => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
    }

    const VOICE_MAP: Record<string, string> = {
      "9BWtsMINqrJLrRacOk9x": "alloy",
      "EXAVITQu4vr4xnSDxMaL": "nova",
      "cgSgspJ2msm6clMCkdW9": "shimmer",
      "pFZP5JQG7iQjIQuC4Bku": "coral",
      "XB0fDUnXU5powFXDhCwa": "echo",
      "XrExE9yKIg1WjnnlVkGX": "fable",
    };

    const mappedVoice = voiceId ? (VOICE_MAP[voiceId] || "alloy") : "alloy";

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: mappedVoice,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI TTS API error:", response.status, errorText);
      return res.status(response.status).json({ error: `OpenAI TTS API error: ${response.status}`, details: errorText });
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    res.json({ audioContent: base64Audio });
  } catch (error: any) {
    console.error("Error in openai-tts:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
