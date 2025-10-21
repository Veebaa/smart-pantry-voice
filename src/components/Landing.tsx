import { Auth } from "@/components/Auth";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, ChefHat, ShoppingCart, Sparkles } from "lucide-react";

export const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Voice-enabled</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
            Sage,
            <br />
            Your AI-Powered Kitchen Assistant
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Manage your food inventory hands-free with voice commands. Get personalized meal suggestions, 
            track ingredients, and never forget what's running low—all tailored to your dietary needs and household size.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Voice Control</h3>
              <p className="text-sm text-muted-foreground">
                Simply say "add milk to fridge" or "low on olive oil"—your pantry updates instantly with smart categorisation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                <ChefHat className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Meal Ideas</h3>
              <p className="text-sm text-muted-foreground">
                Get AI-powered meal suggestions based on what you have, your dietary preferences, and household size.
              </p>
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <ShoppingCart className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Auto Shopping Lists</h3>
              <p className="text-sm text-muted-foreground">
                Track low-stock items and automatically generate shopping lists with missing ingredients for your meals.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Speak Naturally</h3>
                <p className="text-muted-foreground">
                  Use your voice to add or update items: "add two cartons of milk to the fridge" or "running low on pasta."
                  The assistant understands you and organizes everything automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Get Personalized Suggestions</h3>
                <p className="text-muted-foreground">
                  Based on your current inventory, dietary restrictions (vegetarian, vegan, gluten-free, etc.), 
                  and household size, receive tailored meal ideas you can make right now.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Shop Smarter</h3>
                <p className="text-muted-foreground">
                  Missing ingredients for a recipe? They're automatically added to your shopping list. 
                  Plus, get daily alerts for items running low like milk, bread, and cereals.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Section */}
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold mb-2">Ready to Get Started?</h2>
            <p className="text-muted-foreground">Create your free account and start managing your pantry today</p>
          </div>
          <Auth />
        </div>
      </div>
    </div>
  );
};
