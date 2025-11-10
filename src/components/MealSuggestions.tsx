import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChefHat, Check, ShoppingCart, CookingPot } from "lucide-react";

interface MealSuggestion {
  name: string;
  ingredients_available?: string[];
  ingredients_needed?: string[];
  recipe?: {
    ingredients_with_quantities: string[];
    cooking_steps: string[];
    tips?: string;
  };
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
        <Accordion type="single" collapsible className="w-full space-y-4">
          {meals.map((meal, index) => (
            <AccordionItem key={index} value={`meal-${index}`} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <CookingPot className="h-5 w-5 text-primary flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-primary">{meal.name}</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* Quick overview badges */}
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

                {/* Full Recipe */}
                {meal.recipe && (
                  <div className="space-y-4 mt-4 border-t pt-4">
                    <div>
                      <h4 className="font-semibold text-base mb-3">Ingredients</h4>
                      <ul className="space-y-1.5">
                        {meal.recipe.ingredients_with_quantities.map((ingredient, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-sm">{ingredient}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-base mb-3">Let's Get Cooking!</h4>
                      <ol className="space-y-3">
                        {meal.recipe.cooking_steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                              {i + 1}
                            </span>
                            <span className="text-sm pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {meal.recipe.tips && (
                      <div className="bg-accent/20 rounded-lg p-4">
                        <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                          <ChefHat className="h-4 w-4" />
                          Chef's Tip
                        </h4>
                        <p className="text-sm text-muted-foreground">{meal.recipe.tips}</p>
                      </div>
                    )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
