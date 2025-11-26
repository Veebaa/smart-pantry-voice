import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiRequest, setAuthToken, clearAuthToken, getAuthToken } from "@/lib/api";

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
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Only check auth if we have a token
      const token = getAuthToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      const response = await fetch("/api/auth/user", {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token is invalid, clear it
        clearAuthToken();
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/signin", { email, password });
    if (response.token) {
      setAuthToken(response.token);
    }
    setUser(response.user);
  };

  const signup = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/signup", { email, password });
    if (response.token) {
      setAuthToken(response.token);
    }
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/signout", {});
    } catch (error) {
      // Ignore errors on signout
    }
    clearAuthToken();
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
