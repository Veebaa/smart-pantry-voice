import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, apiRequest, clearCsrfToken, clearLegacyAuthToken, setCsrfToken } from "@/lib/api";

interface User {
  id: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Remove bearer tokens left behind by older versions of the app.
    clearLegacyAuthToken();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await api.auth.getUser();
      setUser(data.user);
    } catch {
      clearCsrfToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/signin", { email, password });
    if (response.csrfToken) setCsrfToken(response.csrfToken);
    setUser(response.user);
  };

  const signup = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/signup", {
      email,
      password,
      confirmPassword: password,
    });
    if (response.csrfToken) setCsrfToken(response.csrfToken);
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/signout", {});
    } catch {
      // Ignore errors on signout
    }
    clearCsrfToken();
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
