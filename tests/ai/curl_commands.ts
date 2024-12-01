import type {
  ApiResponse,
  BaseCard,
  CardMessage,
  CardCommand,
  CardEvent,
  User
} from "../../db/client/types.ts";

export const AiCommands = {
  Card: {
    create(type: string, data: Record<string, unknown>): Promise<ApiResponse<BaseCard>> {
      return fetch(`/cards/${type}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse);
    },

    list(type: string): Promise<ApiResponse<BaseCard[]>> {
      return fetch(`/cards/${type}/list`).then(handleResponse);
    },

    get(type: string, cardId: string): Promise<ApiResponse<BaseCard>> {
      return fetch(`/cards/${type}/api?cardId=${cardId}`).then(handleResponse);
    },

    addMessage(type: string, cardId: string, text: string): Promise<ApiResponse<CardMessage>> {
      return fetch(`/cards/${type}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, text })
      }).then(handleResponse);
    },

    getMessages(type: string, cardId: string): Promise<ApiResponse<CardMessage[]>> {
      return fetch(`/cards/${type}/api/messages?cardId=${cardId}`).then(handleResponse);
    },

    delete(type: string, cardId: string): Promise<ApiResponse<{ success: boolean }>> {
      return fetch(`/cards/${type}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId })
      }).then(handleResponse);
    },

    command(type: string, cardId: string, command: CardCommand): Promise<ApiResponse<unknown>> {
      return fetch(`/cards/${type}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, command })
      }).then(handleResponse);
    },

    event(type: string, cardId: string, event: CardEvent): Promise<ApiResponse<unknown>> {
      return fetch(`/cards/${type}/api/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, event })
      }).then(handleResponse);
    },

    plugin<T>(action: string, ...args: unknown[]): Promise<ApiResponse<T>> {
      return fetch('/cards/plugin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, args })
      }).then(handleResponse);
    }
  },

  User: {
    create(data: Partial<User>): Promise<ApiResponse<User>> {
      return fetch('/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse);
    },

    get(userId: string): Promise<ApiResponse<User>> {
      return fetch(`/users/${userId}`).then(handleResponse);
    },

    update(userId: string, data: Partial<User>): Promise<ApiResponse<User>> {
      return fetch(`/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse);
    },

    delete(userId: string): Promise<ApiResponse<{ success: boolean }>> {
      return fetch(`/users/${userId}`, {
        method: 'DELETE'
      }).then(handleResponse);
    }
  },

  Session: {
    createSession(userId: string): Promise<ApiResponse<{ sessionId: string }>> {
      return fetch('/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      }).then(handleResponse);
    },

    validateSession(sessionId: string): Promise<ApiResponse<boolean>> {
      return fetch(`/sessions/validate/${sessionId}`).then(handleResponse);
    }
  },

  View: {
    getView(name: string, user: User | null): Promise<ApiResponse<string>> {
      return fetch(`/views/${name}`, {
        headers: user ? {
          'X-User-Id': user.id,
          'X-User-Data': JSON.stringify(user)
        } : {}
      }).then(handleResponse);
    },

    getWidget(name: string, user: User | null): Promise<ApiResponse<string>> {
      return fetch(`/widgets/${name}`, {
        headers: user ? {
          'X-User-Id': user.id,
          'X-User-Data': JSON.stringify(user)
        } : {}
      }).then(handleResponse);
    }
  }
};

function handleResponse(response: Response) {
  return response.json().then(data => ({
    status: response.status,
    data: response.ok ? data : null,
    error: !response.ok ? data.error : null
  }));
} 