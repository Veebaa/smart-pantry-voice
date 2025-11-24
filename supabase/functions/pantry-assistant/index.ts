import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      voiceInput,
      dietaryRestrictions,
      householdSize,
      recipeFilters,
      lastItem,
      userAnswer,
      pending_item,
    } = await req.json();

    console.log("Incoming request:", { voiceInput, userAnswer, pending_item, lastItem });

    const categories = ["fridge", "freezer", "cupboard", "pantry_staples"];

    // Default locations for obvious items
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

    // Handle follow-up category locally (userAnswer for pending_item)
    if (pending_item && userAnswer) {
      const normalizedCategory = categories.find(cat =>
        userAnswer.toLowerCase().includes(cat)
      );

      if (normalizedCategory && pending_item) {
        console.log(`Adding pending item "${pending_item}" to category "${normalizedCategory}"`);
        console.log("UserAnswer:", userAnswer, "PendingItem:", pending_item, "NormalizedCategory:", normalizedCategory);

        const sageResponse = {
          action: "add_item",
          payload: {
            items: [
              {
                name: pending_item,
                category: normalizedCategory,
                quantity: "unknown",
                is_low: false
              }
            ]
          },
          speak: `Lovely! I've added ${pending_item} to your ${normalizedCategory}.`
        };

        return new Response(JSON.stringify(sageResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else {
        console.log(`Could not determine category from userAnswer: "${userAnswer}"`);
      }
    }

    // Auto-add if item has obvious default location
    if (pending_item) {
      const lowerItem = pending_item.toLowerCase();
      if (defaultLocations[lowerItem]) {
        console.log(`Auto-assigning "${pending_item}" to default category "${defaultLocations[lowerItem]}"`);

        const sageResponse = {
          action: "add_item",
          payload: {
            items: [
              {
                name: pending_item,
                category: defaultLocations[lowerItem],
                quantity: "unknown",
                is_low: false
              }
            ]
          },
          speak: `Added ${pending_item} to the ${defaultLocations[lowerItem]}.`
        };

        return new Response(JSON.stringify(sageResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    console.log("Processing pantry request via AI...");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: pantryItems, error: pantryError } = await supabase
      .from("pantry_items")
      .select("*");

    if (pantryError) throw new Error("Failed to fetch pantry items");
    console.log(`Fetched ${pantryItems?.length || 0} pantry items`);

    // Construct system prompt
    const systemPrompt = `You are Sage, the kitchen assistant.
Your job is to interpret the user's speech text, determine their intent, and return a JSON action.

RULES:
1. If the user adds an item without a category, set action="ask", pending_item="ItemName", and speak: "Fridge, freezer, or cupboard?"
2. If a pending item exists and userAnswer includes a storage category, extract category, set action="add_item", add item, speak confirmation, clear pending item.
3. If user says "skip", "cancel", "never mind", respond with action="none".
4. Otherwise, handle normal commands.

Current pantry inventory:
${JSON.stringify(pantryItems, null, 2)}

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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received:", JSON.stringify(aiResponse?.choices?.[0]?.message?.tool_calls?.[0] || {}));

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const sageResponse = JSON.parse(toolCall.function.arguments);
    console.log("Sage action:", sageResponse.action, "Pending item in response:", sageResponse.payload?.pending_item);

    // If the AI returned meal suggestions, analyze them against the current pantry
    // and produce shoppingListUpdates for missing or low-stock items.
    try {
      if (sageResponse.payload?.meal_suggestions && Array.isArray(sageResponse.payload.meal_suggestions)) {
        // Helper: normalize ingredient/pantry names for matching
        const normalize = (s: any) =>
          (s || "").toString().toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

        const pantryMap = new Map<string, any>();
        for (const p of pantryItems || []) {
          pantryMap.set(normalize(p.name), p);
        }

        const missing = new Set<string>();
        const low = new Set<string>();

        for (const meal of sageResponse.payload.meal_suggestions) {
          // meal could be a string or an object with an `ingredients` array
          const ingredients: any[] = Array.isArray(meal?.ingredients)
            ? meal.ingredients
            : typeof meal === "object" && typeof meal.description === "string"
            ? // try to extract comma-separated tokens from a description
              meal.description.split(/[,;]\s*/)
            : [];

          for (const ing of ingredients) {
            const ingName = normalize(typeof ing === "string" ? ing : ing?.name || ing?.ingredient || "");
            if (!ingName) continue;

            const matched = pantryMap.get(ingName);
            if (!matched) {
              missing.add(typeof ing === "string" ? ing : ing?.name || JSON.stringify(ing));
            } else {
              const isLow = !!matched.is_low || (
                matched.current_quantity != null && matched.low_stock_threshold != null &&
                Number(matched.current_quantity) <= Number(matched.low_stock_threshold)
              );
              if (isLow) low.add(matched.name);
            }
          }
        }

        // Attach a shoppingListUpdates object to the payload so the client can act on it
        sageResponse.payload.shoppingListUpdates = {
          missing: Array.from(missing),
          low: Array.from(low),
        };

        console.log("Computed shoppingListUpdates", sageResponse.payload.shoppingListUpdates);
      }
    } catch (err) {
      console.error("Error computing shoppingListUpdates:", err);
    }

    // Handle add_item in DB
    if (sageResponse.action === "add_item" && sageResponse.payload?.items) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (userId) {
        for (const item of sageResponse.payload.items) {
          if (!item.name || !item.category) {
            console.warn("Invalid item data, skipping:", item);
            continue;
          }

          const { error: insertError } = await supabase
            .from("pantry_items")
            .insert({
              user_id: userId,
              name: item.name,
              category: item.category,
              quantity: item.quantity || null,
              is_low: item.is_low || false
            });

          if (insertError) console.error("Error inserting item:", insertError.message);
          else console.log(`Inserted item "${item.name}" into category "${item.category}"`);
        }
      }
    }

    return new Response(JSON.stringify(sageResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in pantry-assistant:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
