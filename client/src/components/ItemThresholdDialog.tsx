import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

interface ItemThresholdDialogProps {
  itemId: string;
  itemName: string;
  currentQuantity?: number | null;
  threshold?: number | null;
  onUpdate: () => void;
}

export const ItemThresholdDialog = ({
  itemId,
  itemName,
  currentQuantity,
  threshold,
  onUpdate,
}: ItemThresholdDialogProps) => {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(currentQuantity?.toString() || "");
  const [lowThreshold, setLowThreshold] = useState(threshold?.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: {
        current_quantity: number | null;
        low_stock_threshold: number | null;
      } = {
        current_quantity: quantity.trim() !== "" ? parseFloat(quantity) : null,
        low_stock_threshold: lowThreshold.trim() !== "" ? parseFloat(lowThreshold) : null,
      };

      console.log("Saving item data:", updateData);

      await apiRequest("PATCH", `/api/pantry-items/${itemId}`, updateData);

      toast.success("Item settings updated");
      setOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Quantity Alerts for {itemName}</DialogTitle>
          <DialogDescription>
            Set the current quantity and low stock threshold. When quantity drops below the threshold, the item will be marked as running low.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Current Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              step="any" // <-- allow floats
              placeholder="e.g., 5 or 2.5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="threshold">Low Stock Threshold</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              step="any" // <-- allow floats
              placeholder="e.g., 2 or 0.5"
              value={lowThreshold}
              onChange={(e) => setLowThreshold(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              You'll be alerted when quantity reaches this number or below
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
