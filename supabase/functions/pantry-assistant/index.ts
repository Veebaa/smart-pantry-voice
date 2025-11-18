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
    const { voiceInput, dietaryRestrictions, householdSize, recipeFilters, lastItem } = await req.json();
    
    console.log("Received request:", { voiceInput, dietaryRestrictions, householdSize, recipeFilters, lastItem });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Get authorization header for Supabase
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    // Get user's pantry items
    const { data: pantryItems, error: pantryError } = await supabase
      .from("pantry_items")
      .select("*");

    if (pantryError) {
      console.error("Error fetching pantry:", pantryError);
      throw new Error("Failed to fetch pantry items");
    }

    console.log("Fetched pantry items:", pantryItems);

    // System prompt for Sage
    const systemPrompt = `You are Sage, the kitchen assistant.
Your job is to interpret the user's speech text, determine their intent, and return a JSON action.

RULES:
- If the user adds an item without a category, ask: "Fridge, freezer, or cupboard?"
- If the user answers with just a category ("fridge", "freezer", etc.), apply it to the last item.
- Always return JSON in this format:

{
  "action": "<add_item | update_item | ask | none>",
  "payload": {},
  "speak": "<what Sage says>"
}

Current pantry inventory:
${JSON.stringify(pantryItems, null, 2)}

${lastItem ? `Last item waiting for category: ${lastItem}` : ''}

Dietary restrictions: ${dietaryRestrictions?.join(", ") || "None"}
Household size: ${householdSize || 2} people

Recipe preferences: ${recipeFilters && recipeFilters.length > 0 ? recipeFilters.map((f: string) => {
  const filterMap: Record<string, string> = {
    vegetarian: "Vegetarian (no meat)",
    vegan: "Vegan (no animal products)",
    gluten_free: "Gluten-free",
    dairy_free: "Dairy-free",
    nut_free: "Nut-free",
    quick_meals: "Quick meals under 30 minutes",
    kid_friendly: "Kid-friendly (mild flavors, familiar ingredients)"
  };
  return filterMap[f] || f;
}).join(", ") : "No specific preferences"}

IMPORTANT: 
- When suggesting meals, STRICTLY adhere to all active recipe preferences. Only suggest recipes that match ALL selected filters.
- Use warm, friendly language like "Lovely! I've added milk to your fridge." or "Here's what you can make tonight..."
- The "speak" field should contain what you say to the user. This will be converted to speech.
- NO AUDIO OUTPUT. NO BASE64. Only text in "speak" is for TTS.`;

    // Define tool for structured responses
    const tools = [
      {
        type: "function",
        function: {
          name: "sage_response",
          description: "Return Sage's action and speech",
          parameters: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["add_item", "update_item", "ask", "none"],
                description: "The action to take"
              },
              payload: {
                type: "object",
                description: "Action-specific data",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        category: {
                          type: "string",
                          enum: ["fridge", "freezer", "cupboard", "pantry_staples"]
                        },
                        quantity: { type: "string" },
                        is_low: { type: "boolean" }
                      }
                    }
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
                            ingredients_with_quantities: { 
                              type: "array", 
                              items: { type: "string" }
                            },
                            cooking_steps: { 
                              type: "array", 
                              items: { type: "string" }
                            },
                            tips: { type: "string" }
                          }
                        }
                      }
                    }
                  },
                  shopping_list: {
                    type: "array",
                    items: { type: "string" }
                  },
                  pending_item: { type: "string" }
                }
              },
              speak: {
                type: "string",
                description: "What Sage says to the user (will be converted to speech)"
              }
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
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    console.log("AI response:", JSON.stringify(aiResponse, null, 2));

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const sageResponse = JSON.parse(toolCall.function.arguments);
    console.log("Sage response:", sageResponse);

    // Handle database updates for add_item action
    if (sageResponse.action === "add_item" && sageResponse.payload?.items) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (userId) {
        for (const item of sageResponse.payload.items) {
          const { error: insertError } = await supabase
            .from("pantry_items")
            .insert({
              user_id: userId,
              name: item.name,
              category: item.category,
              quantity: item.quantity || null,
              is_low: item.is_low || false
            });

          if (insertError) {
            console.error("Error inserting item:", insertError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify(sageResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in pantry-assistant:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
