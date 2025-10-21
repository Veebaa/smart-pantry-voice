import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShoppingListProps {
  items: string[];
}

export const ShoppingList = ({ items }: ShoppingListProps) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-secondary/20">
      <CardHeader className="bg-gradient-to-r from-secondary/10 to-accent/10">
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-secondary" />
          Shopping List
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-3">
          {items.map((item, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-base py-2 px-4 bg-muted text-foreground hover:bg-muted/90"
            >
              {item}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
