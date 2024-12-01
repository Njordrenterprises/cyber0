// Base types for API responses
interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

// Base configuration
const BASE_URL = "http://localhost:8000";
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

// Helper function for making requests
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...options.headers,
    },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

// Card Operations
export const CardCommands = {
  // List all cards
  listCards(type: string): Promise<ApiResponse> {
    return makeRequest(`/cards/${type}/list`);
  },

  // Create a new card
  createCard(type: string, name: string): Promise<ApiResponse> {
    return makeRequest(`/cards/${type}/create`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  // Delete a card
  deleteCard(type: string, cardId: string): Promise<ApiResponse> {
    return makeRequest(`/cards/${type}/delete`, {
      method: "POST",
      body: JSON.stringify({ cardId }),
    });
  },

  // Get card template
  getTemplate(type: string): Promise<ApiResponse> {
    return makeRequest(`/cards/${type}/template`);
  },
};

// KV Operations
export const KvCommands = {
  // Get a value
  getValue(key: string[]): Promise<ApiResponse> {
    return makeRequest(`/db/get?key=${key.join(",")}`);
  },

  // Set a value
  setValue(key: string[], value: unknown): Promise<ApiResponse> {
    return makeRequest("/db/set", {
      method: "POST",
      body: JSON.stringify({ key: key.join(","), value }),
    });
  },

  // Delete a value
  deleteValue(key: string[]): Promise<ApiResponse> {
    return makeRequest("/db/delete", {
      method: "POST",
      body: JSON.stringify({ key: key.join(",") }),
    });
  },
};

// View Operations
export const ViewCommands = {
  // Get a view
  getView(name: string, user: Record<string, unknown>): Promise<ApiResponse> {
    return makeRequest(`/views/${name}`, {
      headers: {
        'X-User-Id': user.id as string,
        'X-User-Data': JSON.stringify(user)
      }
    });
  },

  // Get a widget
  getWidget(name: string, user: Record<string, unknown>): Promise<ApiResponse> {
    return makeRequest(`/widgets/${name}`, {
      headers: {
        'X-User-Id': user.id as string,
        'X-User-Data': JSON.stringify(user)
      }
    });
  },
};

// User Operations
export const UserCommands = {
  // Get current user
  getCurrentUser(): Promise<ApiResponse> {
    return makeRequest("/user");
  },

  // Update user
  updateUser(data: Partial<{
    username: string;
    color: string;
    sprite: string;
  }>): Promise<ApiResponse> {
    return makeRequest("/user", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// Event Stream Operations
export const EventCommands = {
  // Connect to event stream
  connectToEvents(): EventSource {
    return new EventSource(`${BASE_URL}/events`);
  },
};

// Export all command groups
export const AiCommands = {
  Card: CardCommands,
  Kv: KvCommands,
  View: ViewCommands,
  User: UserCommands,
  Event: EventCommands,
}; 