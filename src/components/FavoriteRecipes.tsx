import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Check, ShoppingCart, CookingPot, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface FavoriteRecipe {
  id: string;
  recipe_name: string;
  recipe_data: {
    ingredients_available?: string[];
    ingredients_needed?: string[];
    recipe?: {
      ingredients_with_quantities?: string[];
      cooking_steps?: string[];
      tips?: string;
    };
  };
}

export const FavoriteRecipes = () => {
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("favorite_recipes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast({
        title: "Error",
        description: "Failed to load favorite recipes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (id: string, recipeName: string) => {
    try {
      const { error } = await supabase
        .from("favorite_recipes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setFavorites(favorites.filter(f => f.id !== id));
      toast({
        title: "Removed from favorites",
        description: `${recipeName} has been removed from your favorites`,
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast({
        title: "Error",
        description: "Failed to remove favorite",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your favorites...</div>;
  }

  if (favorites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Your Favorite Recipes
          </CardTitle>
          <CardDescription>
            Save your favorite recipes by clicking the heart icon on any meal suggestion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No favorite recipes yet. Start exploring meal suggestions!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 fill-current" />
          Your Favorite Recipes ({favorites.length})
        </CardTitle>
        <CardDescription>
          Your saved recipes are always available here
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {favorites.map((favorite) => (
            <AccordionItem key={favorite.id} value={favorite.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="text-lg font-semibold">{favorite.recipe_name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(favorite.id, favorite.recipe_name);
                    }}
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {favorite.recipe_data.ingredients_available && favorite.recipe_data.ingredients_available.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">You have:</p>
                      <div className="flex flex-wrap gap-2">
                        {favorite.recipe_data.ingredients_available.map((ingredient, idx) => (
                          <Badge key={idx} variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" />
                            {ingredient}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {favorite.recipe_data.ingredients_needed && favorite.recipe_data.ingredients_needed.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">You'll need:</p>
                      <div className="flex flex-wrap gap-2">
                        {favorite.recipe_data.ingredients_needed.map((ingredient, idx) => (
                          <Badge key={idx} variant="outline" className="gap-1">
                            <ShoppingCart className="h-3 w-3" />
                            {ingredient}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {favorite.recipe_data.recipe && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-primary">
                        <CookingPot className="h-5 w-5" />
                        <h4 className="font-semibold">Full Recipe</h4>
                      </div>

                      {favorite.recipe_data.recipe.ingredients_with_quantities && (
                        <div>
                          <p className="font-medium mb-2">Ingredients:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {favorite.recipe_data.recipe.ingredients_with_quantities.map((ingredient, idx) => (
                              <li key={idx} className="text-sm">{ingredient}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {favorite.recipe_data.recipe.cooking_steps && (
                        <div>
                          <p className="font-medium mb-2">Method:</p>
                          <ol className="list-decimal list-inside space-y-2">
                            {favorite.recipe_data.recipe.cooking_steps.map((step, idx) => (
                              <li key={idx} className="text-sm">{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {favorite.recipe_data.recipe.tips && (
                        <div className="bg-muted p-3 rounded-md">
                          <p className="font-medium mb-1">Chef's Tip:</p>
                          <p className="text-sm italic">{favorite.recipe_data.recipe.tips}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
