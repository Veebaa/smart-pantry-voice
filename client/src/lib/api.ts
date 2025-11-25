const API_BASE_URL = "";

export async function apiRequest(method: string, endpoint: string, data?: any) {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function internalApiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

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
