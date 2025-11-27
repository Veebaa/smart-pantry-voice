import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Landing } from '../components/Landing';
import { UserProvider } from '../contexts/UserContext';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

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

describe('Landing Component', () => {
  describe('Header', () => {
    it('should render the Sage logo', () => {
      renderWithProviders(<Landing />);
      
      const logos = screen.getAllByText('Sage');
      expect(logos.length).toBeGreaterThanOrEqual(1);
    });

    it('should have Get Started button in header', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByTestId('button-get-started-header')).toBeInTheDocument();
    });

    it('should have theme toggle', () => {
      renderWithProviders(<Landing />);
      
      const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
      expect(themeToggle).toBeInTheDocument();
    });
  });

  describe('Hero Section', () => {
    it('should display voice-enabled badge', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByText('Voice-enabled')).toBeInTheDocument();
    });

    it('should have main headline', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByText('Your AI-Powered Kitchen Assistant')).toBeInTheDocument();
    });

    it('should have descriptive text', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByText(/Manage your food inventory hands-free/i)).toBeInTheDocument();
    });
  });

  describe('Features Section', () => {
    it('should display Voice Control feature', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByText('Voice Control')).toBeInTheDocument();
    });

    it('should display Smart Meal Ideas feature', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByText('Smart Meal Ideas')).toBeInTheDocument();
    });

    it('should display Auto Shopping Lists feature', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByText('Auto Shopping Lists')).toBeInTheDocument();
    });
  });

  describe('How It Works Section', () => {
    it('should have How It Works heading', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByText('How It Works')).toBeInTheDocument();
    });

    it('should display step 1: Speak Naturally', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByText('Speak Naturally')).toBeInTheDocument();
    });

    it('should display step 2: Get Personalised Suggestions', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByText('Get Personalised Suggestions')).toBeInTheDocument();
    });

    it('should display step 3: Shop Smarter', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByText('Shop Smarter')).toBeInTheDocument();
    });
  });

  describe('Auth Section', () => {
    it('should have Ready to Get Started heading', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
    });

    it('should contain Auth component', () => {
      renderWithProviders(<Landing />);
      
      expect(screen.getByTestId('input-email')).toBeInTheDocument();
      expect(screen.getByTestId('input-password')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should scroll to auth section when Get Started is clicked', () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;
      
      renderWithProviders(<Landing />);
      
      const getStartedButton = screen.getByTestId('button-get-started-header');
      fireEvent.click(getStartedButton);
      
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });
});
