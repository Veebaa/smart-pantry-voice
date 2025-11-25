const API_BASE_URL = "";

async function apiRequest(endpoint: string, options: RequestInit = {}) {
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
      return apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    signin: async (email: string, password: string) => {
      return apiRequest("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    signout: async () => {
      return apiRequest("/api/auth/signout", {
        method: "POST",
      });
    },
    getUser: async () => {
      return apiRequest("/api/auth/user");
    },
  },
  pantryItems: {
    getAll: async () => {
      return apiRequest("/api/pantry-items");
    },
    create: async (item: any) => {
      return apiRequest("/api/pantry-items", {
        method: "POST",
        body: JSON.stringify(item),
      });
    },
    update: async (id: string, data: any) => {
      return apiRequest(`/api/pantry-items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string) => {
      return apiRequest(`/api/pantry-items/${id}`, {
        method: "DELETE",
      });
    },
  },
  userSettings: {
    get: async () => {
      return apiRequest("/api/user-settings");
    },
    upsert: async (settings: any) => {
      return apiRequest("/api/user-settings", {
        method: "POST",
        body: JSON.stringify(settings),
      });
    },
  },
  favoriteRecipes: {
    getAll: async () => {
      return apiRequest("/api/favorite-recipes");
    },
    create: async (recipe: any) => {
      return apiRequest("/api/favorite-recipes", {
        method: "POST",
        body: JSON.stringify(recipe),
      });
    },
    delete: async (id: string) => {
      return apiRequest(`/api/favorite-recipes/${id}`, {
        method: "DELETE",
      });
    },
  },
  pantryAssistant: async (data: any) => {
    return apiRequest("/api/pantry-assistant", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  tts: async (text: string, voiceId?: string) => {
    return apiRequest("/api/openai-tts", {
      method: "POST",
      body: JSON.stringify({ text, voiceId }),
    });
  },
};
