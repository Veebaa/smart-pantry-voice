import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { VoiceInput } from "@/components/VoiceInput";
import { PantryInventory } from "@/components/PantryInventory";
import { MealSuggestions } from "@/components/MealSuggestions";
import { ShoppingList } from "@/components/ShoppingList";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface PantryItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  is_low: boolean;
}

interface AssistantResponse {
  items_to_add?: any[];
  meal_suggestions?: any[];
  shopping_list?: string[];
  confirmation_message?: string;
}

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [processing, setProcessing] = useState(false);

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

      const { data, error } = await supabase.functions.invoke("pantry-assistant", {
        body: {
          voiceInput: transcript,
          action: "process_voice",
          dietaryRestrictions: settings?.dietary_restrictions || [],
          householdSize: settings?.household_size || 2,
        },
      });

      if (error) throw error;

      setAssistantResponse(data);
      
      if (data.confirmation_message) {
        toast.success(data.confirmation_message);
      }
    } catch (error: any) {
      console.error("Error processing voice input:", error);
      toast.error(error.message || "Failed to process voice command");
    } finally {
      setProcessing(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
  };

  const handleDeleteItem = (id: string) => {
    setPantryItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const lowStockItems = pantryItems.filter((item) => item.is_low);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Smart Pantry Voice
            </h1>
            <p className="text-muted-foreground mt-1">
              Your AI-powered kitchen assistant
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

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
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

        {/* Voice Input Section */}
        <Card className="mb-8 overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 p-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">Add Items with Your Voice</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Try saying: "Add milk to the fridge" or "I'm running low on olive oil"
              </p>
              <div className="flex justify-center pt-4">
                <VoiceInput onTranscript={handleVoiceInput} disabled={processing} />
              </div>
              {processing && (
                <p className="text-sm text-primary animate-pulse">Processing your request...</p>
              )}
            </div>
          </div>
        </Card>

        {/* AI Response Sections */}
        {assistantResponse && (
          <div className="space-y-6 mb-8">
            {assistantResponse.meal_suggestions && assistantResponse.meal_suggestions.length > 0 && (
              <MealSuggestions meals={assistantResponse.meal_suggestions} />
            )}
            {assistantResponse.shopping_list && assistantResponse.shopping_list.length > 0 && (
              <ShoppingList items={assistantResponse.shopping_list} />
            )}
          </div>
        )}

        {/* Pantry Inventory */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Your Pantry</h2>
          <PantryInventory items={pantryItems} onDelete={handleDeleteItem} />
        </div>
      </div>
    </div>
  );
};

export default Index;
