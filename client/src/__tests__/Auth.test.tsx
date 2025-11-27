import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auth } from '../components/Auth';
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

describe('Auth Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render sign in form by default', () => {
      renderWithProviders(<Auth />);
      
      expect(screen.getByTestId('input-email')).toBeInTheDocument();
      expect(screen.getByTestId('input-password')).toBeInTheDocument();
      expect(screen.getByTestId('button-signin')).toBeInTheDocument();
    });

    it('should switch to sign up form when clicking create account', () => {
      renderWithProviders(<Auth />);
      
      const switchButton = screen.getByText(/create an account/i);
      fireEvent.click(switchButton);
      
      expect(screen.getByTestId('button-signup')).toBeInTheDocument();
    });

    it('should switch back to sign in form', () => {
      renderWithProviders(<Auth />);
      
      const createAccountButton = screen.getByText(/create an account/i);
      fireEvent.click(createAccountButton);
      
      const signInButton = screen.getByText(/sign in instead/i);
      fireEvent.click(signInButton);
      
      expect(screen.getByTestId('button-signin')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should have email input', () => {
      renderWithProviders(<Auth />);
      
      const emailInput = screen.getByTestId('input-email');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have password input', () => {
      renderWithProviders(<Auth />);
      
      const passwordInput = screen.getByTestId('input-password');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should accept email input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Auth />);
      
      const emailInput = screen.getByTestId('input-email');
      await user.type(emailInput, 'test@example.com');
      
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should accept password input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Auth />);
      
      const passwordInput = screen.getByTestId('input-password');
      await user.type(passwordInput, 'TestPassword123');
      
      expect(passwordInput).toHaveValue('TestPassword123');
    });
  });

  describe('Sign Up Form', () => {
    it('should show confirm password field in sign up mode', () => {
      renderWithProviders(<Auth />);
      
      const createAccountButton = screen.getByText(/create an account/i);
      fireEvent.click(createAccountButton);
      
      expect(screen.getByTestId('input-confirm-password')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      renderWithProviders(<Auth />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should have submit buttons', () => {
      renderWithProviders(<Auth />);
      
      const signInButton = screen.getByTestId('button-signin');
      expect(signInButton).toBeInTheDocument();
      expect(signInButton).not.toBeDisabled();
    });
  });
});
