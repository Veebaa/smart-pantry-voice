import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Refrigerator, Wind, Package, Pizza } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ItemThresholdDialog } from "./ItemThresholdDialog";

interface PantryItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  is_low: boolean;
  current_quantity?: number | null;
  low_stock_threshold?: number | null;
}

interface PantryInventoryProps {
  items: PantryItem[];
  onDelete: (id: string) => void;
  onUpdate: () => void;
}

const categoryIcons = {
  fridge: <Refrigerator className="h-5 w-5 text-primary" />,
  freezer: <Wind className="h-5 w-5 text-blue-500" />,
  cupboard: <Package className="h-5 w-5 text-secondary" />,
  pantry_staples: <Pizza className="h-5 w-5 text-accent" />,
};

const categoryLabels = {
  fridge: "Fridge",
  freezer: "Freezer",
  cupboard: "Cupboard",
  pantry_staples: "Pantry Staples",
};

export const PantryInventory = ({ items, onDelete, onUpdate }: PantryInventoryProps) => {
  const groupedItems = items.reduce((acc, item) => {
    // Coerce to float for safety
    const currentQty = item.current_quantity != null ? parseFloat(String(item.current_quantity)) : null;
    const lowThreshold = item.low_stock_threshold != null ? parseFloat(String(item.low_stock_threshold)) : null;

    const normalizedItem = { ...item, current_quantity: currentQty, low_stock_threshold: lowThreshold };

    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(normalizedItem);

    return acc;
  }, {} as Record<string, PantryItem[]>);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("pantry_items").delete().eq("id", id);
      if (error) throw error;
      onDelete(id);
      toast.success("Item removed from pantry");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <Card key={category} className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {categoryIcons[category as keyof typeof categoryIcons]}
              {categoryLabels[category as keyof typeof categoryLabels]}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{item.name}</span>
                    {item.current_quantity != null ? (
                      <span className="text-sm text-muted-foreground">
                        Qty: {item.current_quantity.toFixed(2).replace(/\.00$/, "")}
                        {item.low_stock_threshold != null &&
                          ` / Alert at: ${item.low_stock_threshold.toFixed(2).replace(/\.00$/, "")}`}
                      </span>
                    ) : item.quantity ? (
                      <span className="text-sm text-muted-foreground">({item.quantity})</span>
                    ) : null}
                    {item.is_low && (
                      <Badge variant="destructive" className="text-xs">
                        Running Low
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <ItemThresholdDialog
                      itemId={item.id}
                      itemName={item.name}
                      currentQuantity={item.current_quantity ?? null}
                      threshold={item.low_stock_threshold ?? null}
                      onUpdate={onUpdate}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      {Object.keys(groupedItems).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Your pantry is empty. Use voice commands to add items!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
