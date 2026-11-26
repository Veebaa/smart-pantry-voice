const API_BASE_URL = "";
const TOKEN_KEY = "sage_auth_token";
const CSRF_TOKEN_KEY = "sage_csrf_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getCsrfToken(): string | null {
  return sessionStorage.getItem(CSRF_TOKEN_KEY);
}

export function setCsrfToken(token: string): void {
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
}

export function clearCsrfToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function apiRequest(method: string, endpoint: string, data?: any) {
  return internalApiRequest(endpoint, {
    method,
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}

async function refreshCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/csrf-token`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.csrfToken !== "string") {
    throw new Error(data.error || "Unable to refresh CSRF token");
  }
  setCsrfToken(data.csrfToken);
  return data.csrfToken;
}

async function internalApiRequest(endpoint: string, options: RequestInit = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(method);
  const isPreAuthEndpoint = ["/api/auth/signup", "/api/auth/signin"].includes(endpoint);
  const requiresCsrf = !isSafeMethod && !isPreAuthEndpoint;
  let csrfToken = requiresCsrf ? getCsrfToken() : null;
  if (requiresCsrf && !csrfToken) csrfToken = await refreshCsrfToken();

  const send = () => {
    const headers = new Headers({
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    });
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    if (requiresCsrf && csrfToken) headers.set("X-CSRF-Token", csrfToken);

    return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
      headers,
    });
  };

  let response = await send();
  if (requiresCsrf && response.status === 403) {
    const error = await response.clone().json().catch(() => ({}));
    if (error.code === "CSRF_INVALID") {
      csrfToken = await refreshCsrfToken();
      response = await send();
    }
  }

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
