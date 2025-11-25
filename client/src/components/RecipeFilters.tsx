import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export interface RecipeFilter {
  id: string;
  label: string;
  active: boolean;
}

interface RecipeFiltersProps {
  filters: RecipeFilter[];
  onFilterToggle: (filterId: string) => void;
}

export const RecipeFilters = ({ filters, onFilterToggle }: RecipeFiltersProps) => {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Filter your meal ideas:</p>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Badge
            key={filter.id}
            variant={filter.active ? "default" : "outline"}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => onFilterToggle(filter.id)}
          >
            {filter.active && <Check className="h-3 w-3 mr-1" />}
            {filter.label}
          </Badge>
        ))}
      </div>
    </div>
  );
};
