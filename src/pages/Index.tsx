import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Landing } from "@/components/Landing";
import { VoiceInput } from "@/components/VoiceInput";
import { PantryInventory } from "@/components/PantryInventory";
import { MealSuggestions } from "@/components/MealSuggestions";
import { ShoppingList } from "@/components/ShoppingList";
import { SettingsDialog } from "@/components/SettingsDialog";
import { RecipeFilters, RecipeFilter } from "@/components/RecipeFilters";
import { FavoriteRecipes } from "@/components/FavoriteRecipes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";

interface PantryItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  is_low: boolean;
  current_quantity?: number | null;
  low_stock_threshold?: number | null;
}

interface SageResponse {
  action: "add_item" | "update_item" | "ask" | "none";
  payload?: {
    items?: any[];
    meal_suggestions?: any[];
    shopping_list?: string[];
    pending_item?: string;
  };
  speak: string;
}

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [sageResponse, setSageResponse] = useState<SageResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastItem, setLastItem] = useState<string | null>(null);
  const [pendingTimeout, setPendingTimeout] = useState<NodeJS.Timeout | null>(null);
  const { speak, isSpeaking } = useVoiceOutput();
  const [openMicAfterSpeak, setOpenMicAfterSpeak] = useState(false); // After: const { speak, isSpeaking } = useVoiceOutput();
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPantryItems();
      
      // Subscribe to realtime changes
      const channel = supabase
        .channel("pantry_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pantry_items",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchPantryItems();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Timeout mechanism for pending category questions
  useEffect(() => {
    if (lastItem) {
      // Set 2-minute timeout to auto-cancel pending question
      const timeout = setTimeout(() => {
        setLastItem(null);
        toast.info("Category question timed out");
      }, 120000);
      
      setPendingTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    } else {
      // Clear timeout if lastItem is cleared
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

      setOpenMicAfterSpeak(false); // reset
    }
  }, [isSpeaking, openMicAfterSpeak]);


  const fetchPantryItems = async () => {
    try {
      const { data, error } = await supabase
        .from("pantry_items")
        .select("*")
        .order("added_at", { ascending: false });

      if (error) throw error;
      setPantryItems(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    setProcessing(true);
    try {
      // Get user settings
      const { data: settings } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Get active recipe filters
      const activeFilters = recipeFilters
        .filter((f) => f.active)
        .map((f) => f.id);

      // Build request body for edge function
      const invocationBody: Record<string, any> = lastItem
        ? {
            userAnswer: transcript,         // e.g. "fridge"
            pending_item: lastItem,         // previous item waiting for category
            dietaryRestrictions: settings?.dietary_restrictions || [],
            householdSize: settings?.household_size || 2,
            recipeFilters: activeFilters,
          }
        : {
            voiceInput: transcript,         // normal flow
            dietaryRestrictions: settings?.dietary_restrictions || [],
            householdSize: settings?.household_size || 2,
            recipeFilters: activeFilters,
          };

      const { data, error } = await supabase.functions.invoke(
        "pantry-assistant",
        { body: invocationBody }
      );

      if (error) throw error;

      console.log("Sage response:", data);

      // If Sage asks for category, save pending item
      if (data.action === "ask" && data.payload?.pending_item) {
        setLastItem(data.payload.pending_item);  // persist pending item
        setOpenMicAfterSpeak(true);              // open mic after speaking
        speak(data.speak);
        toast.info(data.speak);
        setProcessing(false);
        return;
      }

      // If Sage adds item, clear pending item
      if (data.action === "add_item") {
        setLastItem(null);  // resolved, clear pending
        toast.success("Pantry updated!");
      }

      setSageResponse(data);

      if (data.speak) speak(data.speak);

      await fetchPantryItems();
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
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
  };

  const handleDeleteItem = (id: string) => {
    setPantryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCancelPending = () => {
    setLastItem(null);
    toast.info("Category question cancelled");
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

  const lowStockItems = pantryItems.filter((item) => item.is_low);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
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
            <SettingsDialog />
            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              className="rounded-full"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Pending category question indicator */}
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
                      Say "fridge", "freezer", "cupboard" - or say "skip" to cancel (auto-cancel in 60s)
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancelPending}
                  className="border-orange-600 text-orange-600 hover:bg-orange-100"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voice Input Section */}
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

        {/* Tabbed Navigation */}
        <Tabs defaultValue="pantry" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="pantry">Your Pantry</TabsTrigger>
            <TabsTrigger value="meals">Meal Suggestions</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="shopping">Shopping List</TabsTrigger>
          </TabsList>

          <TabsContent value="pantry" className="space-y-6">
            {/* Low Stock Alert */}
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
            
            {sageResponse?.payload?.meal_suggestions && sageResponse.payload.meal_suggestions.length > 0 ? (
              <MealSuggestions meals={sageResponse.payload.meal_suggestions} />
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>Ask for meal suggestions using voice commands!</p>
                  <p className="text-sm mt-2">Try saying: "What can I cook?" or "Suggest meals"</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="favorites">
            <FavoriteRecipes />
          </TabsContent>

          <TabsContent value="shopping">
            {sageResponse?.payload?.shopping_list && sageResponse.payload.shopping_list.length > 0 ? (
              <ShoppingList items={sageResponse.payload.shopping_list} />
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>Your shopping list will appear here</p>
                  <p className="text-sm mt-2">Try saying: "Create shopping list" or "What do I need?"</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
