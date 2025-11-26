const API_BASE_URL = "";
const TOKEN_KEY = "sage_auth_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function apiRequest(method: string, endpoint: string, data?: any) {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  // Check content type to detect HTML responses (usually means routing issue)
  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    console.error(`API returned non-JSON response for ${endpoint}:`, contentType);
    throw new Error("Server returned an unexpected response. Please refresh the page.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function internalApiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  // Check content type to detect HTML responses (usually means routing issue)
  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    console.error(`API returned non-JSON response for ${endpoint}:`, contentType);
    throw new Error("Server returned an unexpected response. Please refresh the page.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  auth: {
    signup: async (email: string, password: string) => {
      return internalApiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    signin: async (email: string, password: string) => {
      return internalApiRequest("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    signout: async () => {
      return internalApiRequest("/api/auth/signout", {
        method: "POST",
      });
    },
    getUser: async () => {
      return internalApiRequest("/api/auth/user");
    },
  },
  pantryItems: {
    getAll: async () => {
      return internalApiRequest("/api/pantry-items");
    },
    create: async (item: any) => {
      return internalApiRequest("/api/pantry-items", {
        method: "POST",
        body: JSON.stringify(item),
      });
    },
    update: async (id: string, data: any) => {
      return internalApiRequest(`/api/pantry-items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string) => {
      return internalApiRequest(`/api/pantry-items/${id}`, {
        method: "DELETE",
      });
    },
  },
  userSettings: {
    get: async () => {
      return internalApiRequest("/api/user-settings");
    },
    upsert: async (settings: any) => {
      return internalApiRequest("/api/user-settings", {
        method: "POST",
        body: JSON.stringify(settings),
      });
    },
  },
  favoriteRecipes: {
    getAll: async () => {
      return internalApiRequest("/api/favorite-recipes");
    },
    create: async (recipe: any) => {
      return internalApiRequest("/api/favorite-recipes", {
        method: "POST",
        body: JSON.stringify(recipe),
      });
    },
    delete: async (id: string) => {
      return internalApiRequest(`/api/favorite-recipes/${id}`, {
        method: "DELETE",
      });
    },
  },
  pantryAssistant: async (data: any) => {
    return internalApiRequest("/api/pantry-assistant", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  tts: async (text: string, voiceId?: string) => {
    return internalApiRequest("/api/openai-tts", {
      method: "POST",
      body: JSON.stringify({ text, voiceId }),
    });
  },
};
