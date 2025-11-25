import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { apiRequest } from "@/lib/api";
import { Landing } from "@/components/Landing";
import { VoiceInput } from "@/components/VoiceInput";
import { PantryInventory } from "@/components/PantryInventory";
import { MealSuggestions } from "@/components/MealSuggestions";
import { ShoppingList } from "@/components/ShoppingList";
import { SettingsDialog } from "@/components/SettingsDialog";
import { RecipeFilters, RecipeFilter } from "@/components/RecipeFilters";
import { FavoriteRecipes } from "@/components/FavoriteRecipes";
import { RecipeHistory } from "@/components/RecipeHistory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, AlertCircle, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";

interface PantryItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  isLow: boolean;
  currentQuantity?: number | null;
  lowStockThreshold?: number | null;
  expiresAt?: string | null;
}

interface SageResponse {
  action: "add_item" | "update_item" | "ask" | "none" | "suggest_meals" | "generate_shopping_list" | "add_to_shopping_list" | "undo";
  meal_suggestions?: any[];
  pending_item?: string;
  payload?: {
    items?: any[];
    meal_suggestions?: any[];
    shopping_list?: string[];
    pending_item?: string;
  };
  speak: string;
}

interface ShoppingListItem {
  id: string;
  name: string;
  quantity?: string | null;
  checked: boolean;
}

const Index = () => {
  const { user, loading, logout } = useUser();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [shoppingListItems, setShoppingListItems] = useState<ShoppingListItem[]>([]);
  const [sageResponse, setSageResponse] = useState<SageResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastItem, setLastItem] = useState<string | null>(null);
  const [pendingTimeout, setPendingTimeout] = useState<NodeJS.Timeout | null>(null);
  const { speak, isSpeaking } = useVoiceOutput();
  const [openMicAfterSpeak, setOpenMicAfterSpeak] = useState(false);
  const [recipeFilters, setRecipeFilters] = useState<RecipeFilter[]>([
    { id: "vegetarian", label: "Vegetarian", active: false },
    { id: "vegan", label: "Vegan", active: false },
    { id: "gluten_free", label: "Gluten-free", active: false },
    { id: "dairy_free", label: "Dairy-free", active: false },
    { id: "nut_free", label: "Nut-free", active: false },
    { id: "quick_meals", label: "Quick meals (< 30 min)", active: false },
    { id: "kid_friendly", label: "Kid-friendly", active: false },
  ]);

  useEffect(() => {
    if (user) {
      fetchPantryItems();
      fetchShoppingListItems();
      
      const interval = setInterval(() => {
        fetchPantryItems();
        fetchShoppingListItems();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (lastItem) {
      const timeout = setTimeout(() => {
        setLastItem(null);
        toast.info("Category question timed out");
      }, 120000);
      
      setPendingTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    } else {
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
        setPendingTimeout(null);
      }
    }
  }, [lastItem]);

  useEffect(() => {
    if (!isSpeaking && openMicAfterSpeak) {
      const voiceInputEl = document.getElementById("voice-input-button");
      if (voiceInputEl) voiceInputEl.click();

      setOpenMicAfterSpeak(false);
    }
  }, [isSpeaking, openMicAfterSpeak]);

  const fetchPantryItems = async () => {
    try {
      console.log("Fetching pantry items (API)...");
      const data = await apiRequest("GET", "/api/pantry-items");
      setPantryItems(data || []);
      return data || [];
    } catch (error: any) {
      toast.error(error.message);
      return [];
    }
  };

  const fetchShoppingListItems = async () => {
    try {
      const data = await apiRequest("GET", "/api/shopping-list");
      setShoppingListItems(data || []);
      return data || [];
    } catch (error: any) {
      console.error("Error fetching shopping list:", error.message);
      return [];
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    setProcessing(true);

    try {
      const settings = await apiRequest("GET", "/api/user-settings");

      const activeFilters = recipeFilters.filter(f => f.active).map(f => f.id);

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

      const lowerTranscript = transcript.toLowerCase();

      const autoAddItem = Object.keys(defaultLocations).find(item =>
        lowerTranscript.includes(item)
      );

      if (autoAddItem) {
        console.log(`Auto-adding obvious item: ${autoAddItem}`);
        const category = defaultLocations[autoAddItem];

        try {
          await apiRequest("POST", "/api/pantry-items", {
            name: autoAddItem,
            category: category,
            quantity: "unknown",
            isLow: false,
          });
        } catch (insertError: any) {
          console.error("Error inserting auto-added item:", insertError.message);
          toast.error(`Failed to add ${autoAddItem} to pantry`);
        }

        const autoAddResponse: SageResponse = {
          action: "add_item",
          payload: {
            items: [
              { name: autoAddItem, category, quantity: "unknown", isLow: false },
            ],
          },
          speak: `Added ${autoAddItem} to the ${category}.`,
        };

        setSageResponse(autoAddResponse);

        speak(autoAddResponse.speak, {
          onend: async () => {
            console.log("Fetching pantry items (after auto-add)...");
            const items = await fetchPantryItems();
            console.log("Current pantry:", items);
            const voiceInputEl = document.getElementById("voice-input-button");
            if (voiceInputEl) voiceInputEl.click();
          },
        });

        setProcessing(false);
        return;
      }

      console.log("Preparing invocation body: fetching current pantry items to include in payload...");
      const currentPantryItems = await fetchPantryItems();

      const invocationBody: Record<string, any> = lastItem
        ? {
            userAnswer: transcript,
            pending_item: lastItem,
            dietaryRestrictions: settings?.dietary_restrictions || [],
            householdSize: settings?.household_size || 2,
            recipeFilters: activeFilters,
            pantryItems: currentPantryItems,
          }
        : {
            voiceInput: transcript,
            dietaryRestrictions: settings?.dietary_restrictions || [],
            householdSize: settings?.household_size || 2,
            recipeFilters: activeFilters,
            pantryItems: currentPantryItems,
          };

      console.log("Sending to Pantry Assistant:", invocationBody);

      const data = await apiRequest("POST", "/api/pantry-assistant", invocationBody);

      console.log("Raw Sage response from API:", data);

      if (data.action === "ask") {
        // Check both root level and payload for pending_item
        const pendingItem = data.pending_item || data.payload?.pending_item;
        if (pendingItem) {
          console.log("Pending item set:", pendingItem);
          setLastItem(pendingItem);
        }
        speak(data.speak, {
          onend: () => {
            // Open mic after asking follow-up question
            setOpenMicAfterSpeak(true);
          },
        });
        toast.info(data.speak);
        setProcessing(false);
        return;
      }

      if (data.action === "add_item") {
        console.log("Item added, clearing pending item:", lastItem);
        setLastItem(null);
        toast.success("Pantry updated!");
      }

      if (data.action === "update_item") {
        console.log("Item updated (marked as low stock):", data.payload);
        setLastItem(null);
        toast.success("Item marked as running low!");
        // Refresh pantry items to show updated status
        await fetchPantryItems();
      }

      if (data.action === "generate_shopping_list") {
        console.log("Shopping list generated:", data.payload?.shopping_list);
        toast.success("Shopping list ready!");
      }

      if (data.action === "none") {
        console.log("Action none received, pending item cleared:", lastItem);
        setLastItem(null);
        toast.info(data.speak || "Action skipped");
      }

      if (data.action === "suggest_meals") {
        toast.success("Meal suggestions ready!");
        setSageResponse(data);
        if (data.speak) {
          speak(data.speak, {
            onend: () => fetchPantryItems(),
          });
        }
        return;
      }

      // Handle add_to_shopping_list action
      if (data.action === "add_to_shopping_list") {
        toast.success("Added to shopping list!");
        setSageResponse(data);
        if (data.speak) {
          speak(data.speak, {
            onend: async () => {
              await fetchShoppingListItems();
              const voiceInputEl = document.getElementById("voice-input-button");
              setTimeout(() => {
                if (voiceInputEl && !isSpeaking) voiceInputEl.click();
              }, 250);
            },
          });
        } else {
          await fetchShoppingListItems();
        }
        return;
      }

      // Handle update_item action (for low stock updates)
      if (data.action === "update_item") {
        toast.success("Item updated!");
        setSageResponse(data);
        if (data.speak) {
          speak(data.speak, {
            onend: async () => {
              await fetchPantryItems();
              await fetchShoppingListItems();
              const voiceInputEl = document.getElementById("voice-input-button");
              setTimeout(() => {
                if (voiceInputEl && !isSpeaking) voiceInputEl.click();
              }, 250);
            },
          });
        } else {
          await fetchPantryItems();
          await fetchShoppingListItems();
        }
        return;
      }

      setSageResponse(data);

      if (data.speak) {
        speak(data.speak, {
          onend: async () => {
            console.log("Fetching pantry items (after API response)...");
            const items = await fetchPantryItems();
            console.log("Current pantry:", items);
            await fetchShoppingListItems();

            const voiceInputEl = document.getElementById("voice-input-button");

            setTimeout(() => {
              if (voiceInputEl && !isSpeaking) voiceInputEl.click();
            }, 250);
          },
        });
      } else {
        console.log("Fetching pantry items (after API response - no speak)...");
        const items = await fetchPantryItems();
        console.log("Current pantry:", items);
        await fetchShoppingListItems();
        const voiceInputEl = document.getElementById("voice-input-button");
        if (voiceInputEl && !isSpeaking) voiceInputEl.click();
      }

    } catch (error: any) {
      console.error("Error processing voice input:", error);
      toast.error(error.message || "Failed to process voice command");
    } finally {
      setProcessing(false);
    }
  };

  const handleFilterToggle = (filterId: string) => {
    setRecipeFilters((prev) =>
      prev.map((filter) =>
        filter.id === filterId ? { ...filter, active: !filter.active } : filter
      )
    );
  };

  const handleSignOut = async () => {
    await logout();
    toast.success("Signed out successfully");
  };

  const handleDeleteItem = (id: string) => {
    setPantryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCancelPending = () => {
    setLastItem(null);
    toast.info("Category question cancelled");
  };

  const handleUndo = async () => {
    try {
      const response = await apiRequest("POST", "/api/undo");
      if (response.success) {
        toast.success(response.message);
        await fetchPantryItems();
        await fetchShoppingListItems();
      } else {
        toast.info(response.error || "Nothing to undo");
      }
    } catch (error: any) {
      if (error.message?.includes("Nothing to undo")) {
        toast.info("Nothing to undo");
      } else {
        toast.error(error.message || "Failed to undo");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  const lowStockItems = pantryItems.filter((item) => item.isLow);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Sage
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleUndo}
              className="rounded-full"
              title="Undo last action"
              data-testid="button-undo"
            >
              <Undo2 className="h-5 w-5" />
            </Button>
            <SettingsDialog />
            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              className="rounded-full"
              data-testid="button-signout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {lastItem && (
          <Card className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-900 dark:text-orange-100">
                      Waiting for category: <span className="font-bold">{lastItem}</span>
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Say "fridge", "freezer", "cupboard" - or say "skip" to cancel (auto-cancel in 120s)
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancelPending}
                  className="border-orange-600 text-orange-600 hover:bg-orange-100"
                  data-testid="button-cancel-pending"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8 overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 p-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">Add Items with Your Voice</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {lastItem 
                  ? "Please answer the question" 
                  : "Simply tell me what you have, and I'll organize your pantry for you"}
              </p>
              <VoiceInput 
                onTranscript={handleVoiceInput} 
                disabled={processing || isSpeaking}
              />
              {(processing || isSpeaking) && (
                <p className="text-sm text-primary animate-pulse">
                  {isSpeaking ? "Speaking..." : "Processing your request..."}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Tabs defaultValue="pantry" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="pantry" data-testid="tab-pantry">Pantry</TabsTrigger>
            <TabsTrigger value="meals" data-testid="tab-meals">Meals</TabsTrigger>
            <TabsTrigger value="favorites" data-testid="tab-favorites">Favorites</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
            <TabsTrigger value="shopping" data-testid="tab-shopping">Shopping</TabsTrigger>
          </TabsList>

          <TabsContent value="pantry" className="space-y-6">
            {lowStockItems.length > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Running Low ({lowStockItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {lowStockItems.map((item) => (
                      <Badge key={item.id} variant="destructive">
                        {item.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <PantryInventory items={pantryItems} onDelete={handleDeleteItem} onUpdate={fetchPantryItems} />
          </TabsContent>

          <TabsContent value="meals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customize Your Meal Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <RecipeFilters filters={recipeFilters} onFilterToggle={handleFilterToggle} />
              </CardContent>
            </Card>
            
            {(() => {
              const meals = sageResponse?.meal_suggestions || sageResponse?.payload?.meal_suggestions;
              return meals && meals.length > 0 ? (
                <MealSuggestions meals={meals} />
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>Ask for meal suggestions using voice commands!</p>
                    <p className="text-sm mt-2">Try saying: "What can I cook?" or "Suggest meals"</p>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="favorites">
            <FavoriteRecipes />
          </TabsContent>

          <TabsContent value="history">
            <RecipeHistory />
          </TabsContent>

          <TabsContent value="shopping">
            {(() => {
              // Combine: low stock items from pantry + items added directly to shopping list + AI suggestions
              const lowStockNames = lowStockItems.map(item => item.name);
              const dbShoppingNames = shoppingListItems.filter(i => !i.checked).map(item => item.name);
              const aiShoppingList = sageResponse?.payload?.shopping_list || [];
              // Merge and deduplicate
              const combinedList = [...new Set([...lowStockNames, ...dbShoppingNames, ...aiShoppingList])];
              
              return combinedList.length > 0 ? (
                <ShoppingList 
                  items={combinedList} 
                  shoppingListItems={shoppingListItems}
                  onRefresh={fetchShoppingListItems}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>Your shopping list will appear here</p>
                    <p className="text-sm mt-2">Items marked as "running low" will automatically appear here.</p>
                    <p className="text-sm">Try saying: "Add noodles to shopping list" or "Running low on milk"</p>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
