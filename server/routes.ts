import { Router } from "express";
import { db } from "./db";
import { pantryItems, userSettings, favoriteRecipes, users, insertPantryItemSchema, insertUserSettingsSchema, insertFavoriteRecipeSchema } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, hashPassword, comparePassword, createSession } from "./auth";
import { z } from "zod";

const router = Router();

// Auth routes
router.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const authSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
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
    
    res.cookie("session_token", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    });
    
    res.json({ user: { id: user.id, email: user.email } });
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
    
    res.cookie("session_token", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    });
    
    res.json({ user: { id: user.id, email: user.email } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/auth/signout", requireAuth, async (req, res) => {
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
    const [item] = await db.insert(pantryItems).values(validatedData).returning();
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
    const [item] = await db.update(pantryItems)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, req.user!.id)))
      .returning();
    
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    
    res.json(item);
  } catch (error: any) {
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
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(userSettings.userId, req.user!.id))
        .returning();
    } else {
      [settings] = await db.insert(userSettings).values(validatedData).returning();
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
    const validatedData = insertFavoriteRecipeSchema.parse({ ...req.body, userId: req.user!.id });
    const [recipe] = await db.insert(favoriteRecipes).values(validatedData).returning();
    res.json(recipe);
  } catch (error: any) {
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
    const defaultLocations: Record<string, string> = {
      yoghurt: "fridge",
      milk: "fridge",
      cheese: "fridge",
      eggs: "fridge",
      butter: "fridge",
      apple: "cupboard",
      banana: "cupboard",
      spaghetti: "cupboard",
    };

    // Handle follow-up category locally
    if (pending_item && userAnswer) {
      const normalizedCategory = categories.find(cat =>
        userAnswer.toLowerCase().includes(cat)
      );

      if (normalizedCategory) {
        await db.insert(pantryItems).values({
          userId: req.user!.id,
          name: pending_item,
          category: normalizedCategory as any,
          quantity: "unknown",
          isLow: false,
        });

        return res.json({
          action: "add_item",
          payload: {
            items: [{ name: pending_item, category: normalizedCategory, quantity: "unknown", is_low: false }]
          },
          speak: `Lovely! I've added ${pending_item} to your ${normalizedCategory}.`
        });
      }
    }

    // Auto-add if item has obvious default location
    if (pending_item) {
      const lowerItem = pending_item.toLowerCase();
      if (defaultLocations[lowerItem]) {
        await db.insert(pantryItems).values({
          userId: req.user!.id,
          name: pending_item,
          category: defaultLocations[lowerItem] as any,
          quantity: "unknown",
          isLow: false,
        });

        return res.json({
          action: "add_item",
          payload: {
            items: [{ name: pending_item, category: defaultLocations[lowerItem], quantity: "unknown", is_low: false }]
          },
          speak: `Added ${pending_item} to the ${defaultLocations[lowerItem]}.`
        });
      }
    }

    // Fetch current pantry items
    const currentPantryItems = await db.select().from(pantryItems)
      .where(eq(pantryItems.userId, req.user!.id));

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return res.status(500).json({ error: "LOVABLE_API_KEY not configured" });
    }

    const systemPrompt = `You are Sage, the kitchen assistant.
Your job is to interpret the user's speech text, determine their intent, and return a JSON action.

RULES:
1. If the user adds an item without a category, set action="ask", pending_item="ItemName", and speak: "Fridge, freezer, or cupboard?"
2. If a pending item exists and userAnswer includes a storage category, extract category, set action="add_item", add item, speak confirmation, clear pending item.
3. If user says "skip", "cancel", "never mind", respond with action="none".
4. Otherwise, handle normal commands.

Current pantry inventory:
${JSON.stringify(currentPantryItems, null, 2)}

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
              action: { type: "string", enum: ["add_item", "update_item", "ask", "none"] },
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
                  pending_item: { type: "string" }
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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

    const aiResponse = await response.json();
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

    // Handle add_item in DB
    if (sageResponse.action === "add_item" && sageResponse.payload?.items) {
      for (const item of sageResponse.payload.items) {
        if (!item.name || !item.category) continue;

        await db.insert(pantryItems).values({
          userId: req.user!.id,
          name: item.name,
          category: item.category as any,
          quantity: item.quantity || null,
          isLow: item.is_low || false,
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
