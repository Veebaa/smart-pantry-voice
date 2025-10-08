import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Check, ShoppingCart } from "lucide-react";

interface MealSuggestion {
  name: string;
  ingredients_available?: string[];
  ingredients_needed?: string[];
}

interface MealSuggestionsProps {
  meals: MealSuggestion[];
}

export const MealSuggestions = ({ meals }: MealSuggestionsProps) => {
  if (!meals || meals.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary" />
          Meal Ideas for You
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {meals.map((meal, index) => (
            <div key={index} className="space-y-3">
              <h3 className="text-xl font-semibold text-primary">{meal.name}</h3>
              
              {meal.ingredients_available && meal.ingredients_available.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    You have:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {meal.ingredients_available.map((ingredient, i) => (
                      <Badge key={i} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {meal.ingredients_needed && meal.ingredients_needed.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-secondary" />
                    You'll need:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {meal.ingredients_needed.map((ingredient, i) => (
                      <Badge key={i} variant="outline" className="border-secondary">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
