import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MealSuggestions } from '../components/MealSuggestions';
import { UserProvider } from '../contexts/UserContext';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockMeals = [
  {
    name: 'Pasta Carbonara',
    ingredients_available: ['pasta', 'eggs', 'cheese'],
    ingredients_needed: ['bacon'],
    recipe: {
      ingredients_with_quantities: ['200g pasta', '2 eggs', '50g cheese', '100g bacon'],
      cooking_steps: ['Boil pasta', 'Fry bacon', 'Mix eggs and cheese', 'Combine all'],
      tips: 'Add pasta water to make it creamy',
    },
  },
  {
    name: 'Simple Omelette',
    ingredients_available: ['eggs', 'butter'],
    ingredients_needed: [],
    recipe: {
      ingredients_with_quantities: ['3 eggs', '1 tbsp butter'],
      cooking_steps: ['Beat eggs', 'Melt butter', 'Cook eggs', 'Fold and serve'],
    },
  },
];

const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        {component}
      </UserProvider>
    </QueryClientProvider>
  );
};

describe('MealSuggestions Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render meal suggestions', () => {
      renderWithProviders(<MealSuggestions meals={mockMeals} />);
      
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
      expect(screen.getByText('Simple Omelette')).toBeInTheDocument();
    });

    it('should render the meal ideas header', () => {
      renderWithProviders(<MealSuggestions meals={mockMeals} />);
      
      expect(screen.getByText('Meal Ideas')).toBeInTheDocument();
    });

    it('should show correct number of meals', () => {
      renderWithProviders(<MealSuggestions meals={mockMeals} />);
      
      const mealTitles = screen.getAllByRole('button', { expanded: false });
      expect(mealTitles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Accordion Behavior', () => {
    it('should expand meal details when clicked', () => {
      renderWithProviders(<MealSuggestions meals={mockMeals} />);
      
      const pastaHeader = screen.getByText('Pasta Carbonara');
      fireEvent.click(pastaHeader);
      
      expect(screen.getByText('You have:')).toBeInTheDocument();
    });

    it('should show available ingredients', () => {
      renderWithProviders(<MealSuggestions meals={mockMeals} />);
      
      const pastaHeader = screen.getByText('Pasta Carbonara');
      fireEvent.click(pastaHeader);
      
      expect(screen.getByText('pasta')).toBeInTheDocument();
      expect(screen.getByText('eggs')).toBeInTheDocument();
      expect(screen.getByText('cheese')).toBeInTheDocument();
    });

    it('should show needed ingredients', () => {
      renderWithProviders(<MealSuggestions meals={mockMeals} />);
      
      const pastaHeader = screen.getByText('Pasta Carbonara');
      fireEvent.click(pastaHeader);
      
      expect(screen.getByText("You'll need:")).toBeInTheDocument();
      expect(screen.getByText('bacon')).toBeInTheDocument();
    });
  });

  describe('Recipe Details', () => {
    it('should show cooking steps when expanded', () => {
      renderWithProviders(<MealSuggestions meals={mockMeals} />);
      
      const pastaHeader = screen.getByText('Pasta Carbonara');
      fireEvent.click(pastaHeader);
      
      expect(screen.getByText(/Boil pasta/)).toBeInTheDocument();
      expect(screen.getByText(/Fry bacon/)).toBeInTheDocument();
    });

    it('should show recipe tips if available', () => {
      renderWithProviders(<MealSuggestions meals={mockMeals} />);
      
      const pastaHeader = screen.getByText('Pasta Carbonara');
      fireEvent.click(pastaHeader);
      
      expect(screen.getByText(/Add pasta water to make it creamy/)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should have favorite button for each meal', () => {
      renderWithProviders(<MealSuggestions meals={mockMeals} />);
      
      const favoriteButtons = screen.getAllByTestId(/button-favorite-/);
      expect(favoriteButtons.length).toBe(2);
    });

    it('should have cook button for each meal', () => {
      renderWithProviders(<MealSuggestions meals={mockMeals} />);
      
      const cookButtons = screen.getAllByTestId(/button-cook-/);
      expect(cookButtons.length).toBe(2);
    });
  });

  describe('Empty State', () => {
    it('should handle empty meals array', () => {
      renderWithProviders(<MealSuggestions meals={[]} />);
      
      expect(screen.queryByText('Pasta Carbonara')).not.toBeInTheDocument();
    });
  });

  describe('Meal Without Recipe', () => {
    it('should handle meals without detailed recipe', () => {
      const mealsWithoutRecipe = [
        {
          name: 'Quick Snack',
          ingredients_available: ['crackers'],
          ingredients_needed: [],
        },
      ];
      
      renderWithProviders(<MealSuggestions meals={mealsWithoutRecipe} />);
      
      expect(screen.getByText('Quick Snack')).toBeInTheDocument();
    });
  });
});
