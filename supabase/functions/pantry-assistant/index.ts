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
    const { voiceInput, action, dietaryRestrictions, householdSize } = await req.json();
    
    console.log("Received request:", { voiceInput, action, dietaryRestrictions, householdSize });

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

    // Build system prompt based on action
    let systemPrompt = `You are a warm, friendly, and intelligent pantry and meal planning assistant. 
Always organize your responses into THREE clear sections:
1. **Pantry Update** – Confirm what was added or updated
2. **Meal Ideas** – Suggest meals based on current inventory
3. **Shopping List** – List missing ingredients for suggested meals

Use warm, friendly language like "Lovely! I've added milk to your fridge." or "Here's what you can make tonight..."

Current pantry inventory:
${JSON.stringify(pantryItems, null, 2)}

Dietary restrictions: ${dietaryRestrictions?.join(", ") || "None"}
Household size: ${householdSize || 2} people`;

    if (action === "process_voice") {
      systemPrompt += `\n\nThe user said: "${voiceInput}"

Parse their voice command and:
1. Identify items to add/update (e.g., "add milk to fridge", "low on olive oil")
2. Categorize items into: fridge, freezer, cupboard, or pantry_staples
3. Mark items as low stock if indicated
4. Return structured data for database updates
5. Suggest meals using available ingredients
6. Generate shopping list for missing ingredients`;
    }

    // Define tool for structured pantry updates
    const tools = [
      {
        type: "function",
        function: {
          name: "update_pantry",
          description: "Update pantry inventory based on voice command",
          parameters: {
            type: "object",
            properties: {
              items_to_add: {
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
                  },
                  required: ["name", "category"]
                }
              },
              meal_suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    ingredients_available: { type: "array", items: { type: "string" } },
                    ingredients_needed: { type: "array", items: { type: "string" } }
                  }
                }
              },
              shopping_list: {
                type: "array",
                items: { type: "string" }
              },
              confirmation_message: { type: "string" }
            },
            required: ["confirmation_message"],
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
        tool_choice: { type: "function", function: { name: "update_pantry" } }
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

    // Extract tool call results
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const parsedData = JSON.parse(toolCall.function.arguments);
    console.log("Parsed data:", parsedData);

    // Update database if items to add
    if (parsedData.items_to_add && parsedData.items_to_add.length > 0) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (userId) {
        for (const item of parsedData.items_to_add) {
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
      JSON.stringify(parsedData),
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
