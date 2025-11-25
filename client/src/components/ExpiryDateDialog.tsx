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
import { Calendar } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { format, parseISO, isValid } from "date-fns";

interface ExpiryDateDialogProps {
  itemId: string;
  itemName: string;
  currentExpiry: string | null;
  onUpdate: () => void;
}

export const ExpiryDateDialog = ({
  itemId,
  itemName,
  currentExpiry,
  onUpdate,
}: ExpiryDateDialogProps) => {
  const [open, setOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState(() => {
    if (currentExpiry) {
      const date = parseISO(currentExpiry);
      if (isValid(date)) {
        return format(date, "yyyy-MM-dd");
      }
    }
    return "";
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: { expiresAt: string | null } = {
        expiresAt: expiryDate ? new Date(expiryDate).toISOString() : null,
      };

      await apiRequest("PATCH", `/api/pantry-items/${itemId}`, updateData);

      toast.success("Expiry date updated");
      setOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/pantry-items/${itemId}`, { expiresAt: null });
      toast.success("Expiry date cleared");
      setExpiryDate("");
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
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-expiry-${itemId}`}>
          <Calendar className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Expiry Date for {itemName}</DialogTitle>
          <DialogDescription>
            Track when this item expires. You'll see alerts when items are expiring soon.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="expiry">Expiry Date</Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              data-testid="input-expiry-date"
            />
          </div>
        </div>
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleClear} 
            disabled={saving || !expiryDate}
            data-testid="button-clear-expiry"
          >
            Clear Date
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-expiry">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
