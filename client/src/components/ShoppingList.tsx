import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Share2, Mail, Copy, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

interface ShoppingListItem {
  id: string;
  name: string;
  quantity?: string | null;
  checked: boolean;
}

interface ShoppingListProps {
  items: string[];
  shoppingListItems?: ShoppingListItem[];
  onRefresh?: () => Promise<void>;
}

export const ShoppingList = ({ items, shoppingListItems = [], onRefresh }: ShoppingListProps) => {
  if (!items || items.length === 0) {
    return null;
  }

  const formatShoppingList = () => {
    return `Shopping List:\n${items.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}`;
  };

  const handleShare = async () => {
    const text = formatShoppingList();
    
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Shopping List',
          text: text,
        });
        toast.success("Shared successfully!");
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      toast.error("Sharing not supported on this device");
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(formatShoppingList());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleEmailShare = () => {
    const text = encodeURIComponent(formatShoppingList());
    window.location.href = `mailto:?subject=Shopping List&body=${text}`;
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatShoppingList());
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDeleteItem = async (itemName: string) => {
    const dbItem = shoppingListItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    if (dbItem) {
      try {
        await apiRequest("DELETE", `/api/shopping-list/${dbItem.id}`);
        toast.success(`Removed ${itemName} from shopping list`);
        if (onRefresh) {
          await onRefresh();
        }
      } catch (error) {
        toast.error("Failed to remove item");
      }
    } else {
      toast.info("This item is from low stock - update the pantry item instead");
    }
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <Card className="border-2 border-secondary/20">
      <CardHeader className="bg-gradient-to-r from-secondary/10 to-accent/10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-secondary" />
            Shopping List ({items.length})
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {canShare && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                title="Share"
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={handleWhatsAppShare}
              title="Share via WhatsApp"
              className="bg-[#25D366]/10 hover:bg-[#25D366]/20"
              data-testid="button-whatsapp"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleEmailShare}
              title="Share via Email"
              data-testid="button-email"
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyToClipboard}
              title="Copy to Clipboard"
              data-testid="button-copy"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-3">
          {items.map((item, index) => {
            const isFromDb = shoppingListItems.some(i => i.name.toLowerCase() === item.toLowerCase());
            return (
              <Badge
                key={index}
                variant="outline"
                className="text-base py-2 px-4 bg-muted text-foreground hover:bg-muted/90 flex items-center gap-2"
                data-testid={`badge-shopping-item-${index}`}
              >
                {item}
                {isFromDb && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 hover:bg-destructive/20"
                    onClick={() => handleDeleteItem(item)}
                    data-testid={`button-delete-shopping-${index}`}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
