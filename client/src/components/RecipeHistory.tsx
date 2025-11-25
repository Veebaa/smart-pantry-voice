import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Star, Trash2, ChefHat, Clock, Edit2, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface RecipeHistoryEntry {
  id: string;
  recipeName: string;
  recipeData: any;
  rating: number | null;
  notes: string | null;
  madeAt: string;
}

export const RecipeHistory = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");

  const { data: history = [], isLoading } = useQuery<RecipeHistoryEntry[]>({
    queryKey: ["/api/recipe-history"],
    queryFn: () => apiRequest("GET", "/api/recipe-history"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, rating, notes }: { id: string; rating: number; notes: string }) => {
      return apiRequest("PATCH", `/api/recipe-history/${id}`, { rating, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipe-history"] });
      toast.success("Recipe updated");
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update recipe");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/recipe-history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipe-history"] });
      toast.success("Recipe removed from history");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete recipe");
    },
  });

  const startEditing = (entry: RecipeHistoryEntry) => {
    setEditingId(entry.id);
    setEditRating(entry.rating || 0);
    setEditNotes(entry.notes || "");
  };

  const saveEdit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, rating: editRating, notes: editNotes });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRating(0);
    setEditNotes("");
  };

  const renderStars = (rating: number, interactive: boolean = false, onRate?: (r: number) => void) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={interactive && onRate ? () => onRate(star) : undefined}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            No recipes made yet. When you make a recipe, it will appear here!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => (
        <Card key={entry.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-lg">{entry.recipeName}</CardTitle>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(entry.madeAt), "MMM d, yyyy")}
                  </span>
                  {entry.rating && (
                    <span className="flex items-center gap-1">
                      {renderStars(entry.rating)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {editingId !== entry.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditing(entry)}
                    data-testid={`button-edit-history-${entry.id}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(entry.id)}
                  data-testid={`button-delete-history-${entry.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editingId === entry.id ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Rating</label>
                  {renderStars(editRating, true, setEditRating)}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="How did it turn out? Any changes you made?"
                    className="min-h-[80px]"
                    data-testid="textarea-notes"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {entry.notes && (
                  <p className="text-sm text-muted-foreground italic mb-3">"{entry.notes}"</p>
                )}
                {entry.recipeData?.recipe?.ingredients_with_quantities && (
                  <div className="flex flex-wrap gap-1">
                    {entry.recipeData.recipe.ingredients_with_quantities.slice(0, 5).map((ing: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {ing}
                      </Badge>
                    ))}
                    {entry.recipeData.recipe.ingredients_with_quantities.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{entry.recipeData.recipe.ingredients_with_quantities.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
