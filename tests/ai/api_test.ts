import { assertEquals, assertExists } from 'jsr:@std/assert';

interface CardResponse {
  id: string;
  name: string;
  type: string;
  created: number;
  lastUpdated: number;
  messages: Message[];
  createdBy: Author;
  content: Record<string, unknown>;
  metadata: {
    version: string;
    permissions: {
      canView: string[];
      canEdit: string[];
      canDelete: string[];
    };
  };
}

interface Message {
  id: string;
  cardId: string;
  content: string;
  timestamp: number;
  author: Author;
  type: string;
}

interface Author {
  id: string;
  name: string;
  username: string;
  email: string;
  type: string;
  color: string;
  sprite: string;
  created: number;
  lastSeen: number;
  preferences: {
    theme: 'dark' | 'light';
    language: string;
    notifications: boolean;
  };
  capabilities: {
    canCreateCards: boolean;
    canDeleteCards: boolean;
    canSendMessages: boolean;
    canModifyUsers: boolean;
    allowedCardTypes: string[];
  };
}

interface ErrorResponse {
  error: string;
}

Deno.test('Card API Tests', async (t) => {
  const BASE_URL = 'http://localhost:8000';
  let cardId = '';

  // Helper function to make requests
  async function makeRequest(
    path: string,
    method = 'GET',
    body?: Record<string, unknown>,
  ): Promise<Response> {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    return response;
  }

  await t.step('create card', async () => {
    const response = await makeRequest('/cards/info/create', 'POST', {
      name: 'Test Card',
    });
    assertEquals(response.status, 200);

    const data = await response.json() as CardResponse;
    assertExists(data.id);
    assertEquals(data.name, 'Test Card');
    assertEquals(data.type, 'info');
    cardId = data.id;
  });

  await t.step('list cards', async () => {
    const response = await makeRequest('/cards/info/list');
    assertEquals(response.status, 200);

    const data = await response.json() as CardResponse[];
    assertEquals(Array.isArray(data), true);
    assertEquals(data.length > 0, true);
  });

  await t.step('get card details', async () => {
    const response = await makeRequest(`/cards/info/api?cardId=${cardId}`);
    assertEquals(response.status, 200);

    const data = await response.json() as CardResponse;
    assertEquals(data.id, cardId);
    assertEquals(data.name, 'Test Card');
  });

  await t.step('add message to card', async () => {
    const response = await makeRequest('/cards/info/api', 'POST', {
      cardId,
      text: 'Test message',
    });
    assertEquals(response.status, 200);

    const data = await response.json() as { success: boolean };
    assertEquals(data.success, true);
  });

  await t.step('list card messages', async () => {
    const response = await makeRequest(`/cards/info/api/messages?cardId=${cardId}`);
    assertEquals(response.status, 200);

    const data = await response.json() as Message[];
    assertEquals(Array.isArray(data), true);
    assertEquals(data.length > 0, true);
    assertEquals(data[0].content, 'Test message');
  });

  // Error cases
  await t.step('create card with empty name', async () => {
    const response = await makeRequest('/cards/info/create', 'POST', {
      name: '',
    });
    assertEquals(response.status, 400);

    const data = await response.json() as ErrorResponse;
    assertEquals(data.error, 'Name is required');
  });

  await t.step('get non-existent card', async () => {
    const response = await makeRequest('/cards/info/api?cardId=non-existent-id-123');
    assertEquals(response.status, 404);

    const data = await response.json() as ErrorResponse;
    assertEquals(data.error, 'not found');
  });

  await t.step('add message to non-existent card', async () => {
    const response = await makeRequest('/cards/info/api', 'POST', {
      cardId: 'non-existent-id-123',
      text: 'Test message',
    });
    assertEquals(response.status, 404);

    const data = await response.json() as ErrorResponse;
    assertEquals(data.error, 'not found');
  });

  await t.step('delete card', async () => {
    const response = await makeRequest('/cards/info/delete', 'POST', {
      cardId,
    });
    assertEquals(response.status, 200);

    const data = await response.json() as { success: boolean };
    assertEquals(data.success, true);
  });

  await t.step('verify deletion', async () => {
    const response = await makeRequest(`/cards/info/api?cardId=${cardId}`);
    assertEquals(response.status, 404);

    const data = await response.json() as ErrorResponse;
    assertEquals(data.error, 'not found');
  });
}); 