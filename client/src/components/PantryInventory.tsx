import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Refrigerator, Wind, Package, Pizza, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { ItemThresholdDialog } from "./ItemThresholdDialog";
import { ExpiryDateDialog } from "./ExpiryDateDialog";
import { differenceInDays, format, parseISO, isValid } from "date-fns";

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

function getExpiryStatus(expiresAt: string | null | undefined): { label: string; variant: "default" | "destructive" | "secondary" | "outline"; daysLeft: number | null } {
  if (!expiresAt) return { label: "", variant: "default", daysLeft: null };
  
  const expiryDate = parseISO(expiresAt);
  if (!isValid(expiryDate)) return { label: "", variant: "default", daysLeft: null };
  
  const daysLeft = differenceInDays(expiryDate, new Date());
  
  if (daysLeft < 0) {
    return { label: "Expired", variant: "destructive", daysLeft };
  } else if (daysLeft === 0) {
    return { label: "Expires today", variant: "destructive", daysLeft };
  } else if (daysLeft <= 2) {
    return { label: `Expires in ${daysLeft}d`, variant: "destructive", daysLeft };
  } else if (daysLeft <= 7) {
    return { label: `Expires in ${daysLeft}d`, variant: "secondary", daysLeft };
  } else {
    return { label: format(expiryDate, "MMM d"), variant: "outline", daysLeft };
  }
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
    const currentQty = item.currentQuantity != null ? parseFloat(String(item.currentQuantity)) : null;
    const lowThreshold = item.lowStockThreshold != null ? parseFloat(String(item.lowStockThreshold)) : null;

    const normalizedItem = { ...item, currentQuantity: currentQty, lowStockThreshold: lowThreshold };

    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(normalizedItem);

    return acc;
  }, {} as Record<string, PantryItem[]>);

  const handleDelete = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/pantry-items/${id}`);
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
                  data-testid={`pantry-item-${item.id}`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium">{item.name}</span>
                    {item.currentQuantity != null ? (
                      <span className="text-sm text-muted-foreground">
                        Qty: {item.currentQuantity.toFixed(2).replace(/\.00$/, "")}
                        {item.lowStockThreshold != null &&
                          ` / Alert at: ${item.lowStockThreshold.toFixed(2).replace(/\.00$/, "")}`}
                      </span>
                    ) : item.quantity ? (
                      <span className="text-sm text-muted-foreground">({item.quantity})</span>
                    ) : null}
                    {item.isLow && (
                      <Badge variant="destructive" className="text-xs">
                        Running Low
                      </Badge>
                    )}
                    {(() => {
                      const expiry = getExpiryStatus(item.expiresAt);
                      if (!expiry.label) return null;
                      return (
                        <Badge variant={expiry.variant} className="text-xs flex items-center gap-1">
                          {expiry.daysLeft !== null && expiry.daysLeft <= 2 && <AlertTriangle className="h-3 w-3" />}
                          <Calendar className="h-3 w-3" />
                          {expiry.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="flex gap-1">
                    <ExpiryDateDialog
                      itemId={item.id}
                      itemName={item.name}
                      currentExpiry={item.expiresAt ?? null}
                      onUpdate={onUpdate}
                    />
                    <ItemThresholdDialog
                      itemId={item.id}
                      itemName={item.name}
                      currentQuantity={item.currentQuantity ?? null}
                      threshold={item.lowStockThreshold ?? null}
                      onUpdate={onUpdate}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 p-0"
                      data-testid={`button-delete-${item.id}`}
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
