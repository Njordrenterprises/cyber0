import type { ApiResponse, BaseCard, CardMessage, CardCommand, CardResponse, AnyEvent, User, CardPlugin } from "../../db/client/types.ts";

const API_BASE = "http://localhost:8000";

async function makeRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const data = await response.json();
  return {
    status: response.status,
    data: data as T,
    error: !response.ok ? data.error : undefined
  };
}

export const AiCommands = {
  Card: {
    async getCards(type: string): Promise<ApiResponse<BaseCard[]>> {
      return makeRequest(`/cards/${type}/list`);
    },

    async getCard(type: string, cardId: string): Promise<ApiResponse<BaseCard>> {
      return makeRequest(`/cards/${type}/${cardId}`);
    },

    async createCard(type: string, name: string): Promise<ApiResponse<BaseCard>> {
      return makeRequest(`/cards/${type}/create`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
    },

    async deleteCard(type: string, cardId: string): Promise<ApiResponse<{ success: boolean }>> {
      return makeRequest(`/cards/${type}/delete`, {
        method: 'POST',
        body: JSON.stringify({ cardId })
      });
    },

    async sendMessage(cardId: string, content: string): Promise<ApiResponse<CardMessage>> {
      return makeRequest(`/cards/${cardId}/message`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    },

    async getMessages(cardId: string, options?: { limit?: number; before?: number }): Promise<ApiResponse<CardMessage[]>> {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.before) params.set('before', options.before.toString());
      return makeRequest(`/cards/${cardId}/messages?${params}`);
    },

    async executeCommand(command: CardCommand): Promise<ApiResponse<CardResponse>> {
      return makeRequest(`/cards/${command.target.cardId}/command`, {
        method: 'POST',
        body: JSON.stringify(command)
      });
    },

    // Plugin methods
    async registerPlugin(plugin: CardPlugin): Promise<ApiResponse<{ success: boolean }>> {
      return makeRequest('/plugins/register', {
        method: 'POST',
        body: JSON.stringify(plugin)
      });
    },

    async unregisterPlugin(pluginName: string): Promise<ApiResponse<{ success: boolean }>> {
      return makeRequest(`/plugins/${pluginName}/unregister`, {
        method: 'POST'
      });
    },

    async getPluginState(pluginName: string): Promise<ApiResponse<unknown>> {
      return makeRequest(`/plugins/${pluginName}/state`);
    },

    async setPluginState(pluginName: string, state: unknown): Promise<ApiResponse<{ success: boolean }>> {
      return makeRequest(`/plugins/${pluginName}/state`, {
        method: 'POST',
        body: JSON.stringify({ state })
      });
    },

    async getPluginResource(pluginName: string, resourcePath: string): Promise<ApiResponse<unknown>> {
      return makeRequest(`/plugins/${pluginName}/resources/${resourcePath}`);
    },

    async setPluginResource(pluginName: string, resourcePath: string, resource: unknown): Promise<ApiResponse<{ success: boolean }>> {
      return makeRequest(`/plugins/${pluginName}/resources/${resourcePath}`, {
        method: 'POST',
        body: JSON.stringify({ resource })
      });
    }
  },

  View: {
    async getView(name: string, user: User): Promise<ApiResponse<string>> {
      return makeRequest(`/views/${name}`, {
        headers: {
          'X-User-Id': user.id,
          'X-User-Data': JSON.stringify(user)
        }
      });
    },

    async getWidget(name: string, user: User): Promise<ApiResponse<string>> {
      return makeRequest(`/widgets/${name}`, {
        headers: {
          'X-User-Id': user.id,
          'X-User-Data': JSON.stringify(user)
        }
      });
    }
  },

  User: {
    async get(userId: string): Promise<ApiResponse<User>> {
      return makeRequest(`/user/${userId}`);
    },

    async update(userId: string, data: Partial<User>): Promise<ApiResponse<User>> {
      return makeRequest(`/user/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async delete(userId: string): Promise<ApiResponse<{ success: boolean }>> {
      return makeRequest(`/user/${userId}`, {
        method: "DELETE"
      });
    },

    async createSession(userId: string): Promise<ApiResponse<{ sessionId: string; cookie: string }>> {
      return makeRequest(`/user/${userId}/session`, {
        method: 'POST'
      });
    },

    async validateSession(sessionId: string): Promise<ApiResponse<{ valid: boolean }>> {
      return makeRequest(`/session/${sessionId}/validate`);
    }
  },

  Event: {
    async subscribe(): Promise<ApiResponse<{ connectionId: string }>> {
      return makeRequest('/events/subscribe');
    },

    async unsubscribe(connectionId: string): Promise<ApiResponse<{ success: boolean }>> {
      return makeRequest(`/events/unsubscribe/${connectionId}`);
    },

    async publish(event: AnyEvent): Promise<ApiResponse<{ success: boolean }>> {
      return makeRequest('/events/publish', {
        method: 'POST',
        body: JSON.stringify(event)
      });
    },

    async getHistory(filter?: { type?: string }): Promise<ApiResponse<AnyEvent[]>> {
      const params = filter ? `?type=${filter.type}` : '';
      return makeRequest(`/events/history${params}`);
    }
  },

  Kv: {
    async get<T>(key: string[]): Promise<ApiResponse<T | null>> {
      return makeRequest(`/db/get`, {
        method: 'POST',
        body: JSON.stringify({ key })
      });
    },

    async set<T>(key: string[], value: T): Promise<ApiResponse<{ success: boolean }>> {
      return makeRequest(`/db/set`, {
        method: 'POST',
        body: JSON.stringify({ key, value })
      });
    },

    async delete(key: string[]): Promise<ApiResponse<{ success: boolean }>> {
      return makeRequest(`/db/delete`, {
        method: 'POST',
        body: JSON.stringify({ key })
      });
    },

    async list<T>(prefix: string[]): Promise<ApiResponse<T[]>> {
      return makeRequest(`/db/list`, {
        method: 'POST',
        body: JSON.stringify({ prefix })
      });
    },

    async atomic(operations: { type: string; key: string[]; value?: unknown }[]): Promise<ApiResponse<{ success: boolean }>> {
      return makeRequest(`/db/atomic`, {
        method: 'POST',
        body: JSON.stringify({ operations })
      });
    }
  }
}; 