import { assertEquals, assert } from "jsr:@std/assert";
import type { BaseCard, CardMessage } from "../../db/client/types.ts";

const API_BASE = "http://localhost:8000";
const LOG_FILE = "card_test.log";

interface ApiResponse<T> {
  status: number;
  data: T | null;
  error: string | null;
}

interface LogEntry {
  timestamp: string;
  test: string;
  request: {
    method: string;
    path: string;
    body?: unknown;
  };
  response: {
    status: number;
    data?: unknown;
    error?: string;
  };
}

async function appendToLog(entry: LogEntry) {
  const logLine = JSON.stringify(entry) + "\n";
  await Deno.writeTextFile(LOG_FILE, logLine, { append: true });
}

async function callApi<T>(path: string, options: RequestInit = {}, testName: string): Promise<ApiResponse<T>> {
  const timestamp = new Date().toISOString();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  let responseData;
  let responseError;
  try {
    const text = await response.text();
    try {
      responseData = JSON.parse(text);
    } catch {
      responseError = text;
    }
  } catch (e) {
    responseError = e instanceof Error ? e.message : String(e);
  }

  const logEntry: LogEntry = {
    timestamp,
    test: testName,
    request: {
      method: options.method || 'GET',
      path,
      body: options.body ? JSON.parse(options.body as string) : undefined
    },
    response: {
      status: response.status,
      data: responseData,
      error: responseError
    }
  };
  await appendToLog(logEntry);

  return {
    status: response.status,
    data: response.ok ? responseData : null,
    error: !response.ok ? (responseData?.error || responseError) : null
  };
}

async function checkForErrors() {
  try {
    const logContent = await Deno.readTextFile(LOG_FILE);
    const errors = logContent
      .split('\n')
      .filter(line => line)
      .map(line => JSON.parse(line) as LogEntry)
      .filter(entry => entry.response.status >= 400 || entry.response.error)
      .map(entry => ({
        test: entry.test,
        path: entry.request.path,
        method: entry.request.method,
        status: entry.response.status,
        error: entry.response.error,
        requestBody: entry.request.body
      }));

    if (errors.length > 0) {
      console.error('\nErrors found during test execution:');
      console.error(JSON.stringify(errors, null, 2));
    }
  } catch (e) {
    console.error('Error reading log file:', e);
  }
}

Deno.test("Card Operations", async (t) => {
  // Clear log file at start
  await Deno.writeTextFile(LOG_FILE, '');

  await t.step("create info card", async () => {
    const response = await callApi<BaseCard>("/cards/info/create", {
      method: 'POST',
      body: JSON.stringify({ name: "Test Create Card" })
    }, "create info card");

    assertEquals(response.status, 200);
    assert(response.data);
    assert(response.data.id);
    assertEquals(response.data.name, "Test Create Card");
    assertEquals(response.data.type, "info");

    // Cleanup
    await callApi(`/cards/info/delete`, {
      method: 'POST',
      body: JSON.stringify({ cardId: response.data.id })
    }, "create info card - cleanup");
  });

  await t.step("list info cards", async () => {
    // Setup
    const card1 = await callApi<BaseCard>("/cards/info/create", {
      method: 'POST',
      body: JSON.stringify({ name: "Test List Card 1" })
    }, "list info cards - setup");
    const card2 = await callApi<BaseCard>("/cards/info/create", {
      method: 'POST',
      body: JSON.stringify({ name: "Test List Card 2" })
    }, "list info cards - setup");
    
    const response = await callApi<BaseCard[]>("/cards/info/list", {
      method: 'GET'
    }, "list info cards");
    assertEquals(response.status, 200);
    assert(response.data);
    assert(Array.isArray(response.data));
    assert(response.data.length >= 2);
    assert(response.data.every((card: BaseCard) => card.id && card.name && card.type));
    
    // Cleanup
    if (card1.data) {
      await callApi(`/cards/info/delete`, {
        method: 'POST',
        body: JSON.stringify({ cardId: card1.data.id })
      }, "list info cards - cleanup");
    }
    if (card2.data) {
      await callApi(`/cards/info/delete`, {
        method: 'POST',
        body: JSON.stringify({ cardId: card2.data.id })
      }, "list info cards - cleanup");
    }
  });

  await t.step("get info card", async () => {
    // Setup
    const created = await callApi<BaseCard>("/cards/info/create", {
      method: 'POST',
      body: JSON.stringify({ name: "Test Get Card" })
    }, "get info card - setup");
    assert(created.data);
    
    const response = await callApi<BaseCard>(`/cards/info/api?cardId=${created.data.id}`, {
      method: 'GET'
    }, "get info card");
    assertEquals(response.status, 200);
    assert(response.data);
    assert(response.data.id);
    assertEquals(response.data.id, created.data.id);
    assertEquals(response.data.name, "Test Get Card");
    assertEquals(response.data.type, "info");
    
    // Cleanup
    await callApi(`/cards/info/delete`, {
      method: 'POST',
      body: JSON.stringify({ cardId: created.data.id })
    }, "get info card - cleanup");
  });

  await t.step("add message to card", async () => {
    // Setup
    const created = await callApi<BaseCard>("/cards/info/create", {
      method: 'POST',
      body: JSON.stringify({ name: "Test Message Card" })
    }, "add message to card - setup");
    assert(created.data);
    
    const response = await callApi<CardMessage>(`/cards/info/api`, {
      method: 'POST',
      body: JSON.stringify({ cardId: created.data.id, text: "Test message" })
    }, "add message to card");
    assertEquals(response.status, 200);
    assert(response.data);
    assert(response.data.id);
    assertEquals(response.data.cardId, created.data.id);
    assertEquals(response.data.content, "Test message");
    
    // Cleanup
    await callApi(`/cards/info/delete`, {
      method: 'POST',
      body: JSON.stringify({ cardId: created.data.id })
    }, "add message to card - cleanup");
  });

  await t.step("list card messages", async () => {
    // Setup
    const created = await callApi<BaseCard>("/cards/info/create", {
      method: 'POST',
      body: JSON.stringify({ name: "Test Messages Card" })
    }, "list card messages - setup");
    assert(created.data);

    await callApi<CardMessage>(`/cards/info/api`, {
      method: 'POST',
      body: JSON.stringify({ cardId: created.data.id, text: "Test message 1" })
    }, "list card messages");
    await callApi<CardMessage>(`/cards/info/api`, {
      method: 'POST',
      body: JSON.stringify({ cardId: created.data.id, text: "Test message 2" })
    }, "list card messages");
    
    const response = await callApi<CardMessage[]>(`/cards/info/api/messages?cardId=${created.data.id}`, {
      method: 'GET'
    }, "list card messages");
    assertEquals(response.status, 200);
    assert(response.data);
    assert(Array.isArray(response.data));
    assert(response.data.length >= 2);
    assert(response.data.every((msg: CardMessage) => msg.id && msg.cardId && msg.content));
    
    // Cleanup
    await callApi(`/cards/info/delete`, {
      method: 'POST',
      body: JSON.stringify({ cardId: created.data.id })
    }, "list card messages - cleanup");
  });

  await t.step("create card with empty name", async () => {
    const response = await callApi<BaseCard>("/cards/info/create", {
      method: 'POST',
      body: JSON.stringify({ name: "" })
    }, "create card with empty name");
    assertEquals(response.status, 400);
    assertEquals(response.error, "Name is required");
  });

  await t.step("get non-existent card", async () => {
    const response = await callApi<BaseCard>(`/cards/info/api?cardId=non-existent-id-123`, {
      method: 'GET'
    }, "get non-existent card");
    assertEquals(response.status, 404);
    assertEquals(response.error, "Card not found");
  });

  await t.step("add message to non-existent card", async () => {
    const response = await callApi<CardMessage>(`/cards/info/api`, {
      method: 'POST',
      body: JSON.stringify({ cardId: "non-existent-id-123", text: "Test message" })
    }, "add message to non-existent card");
    assertEquals(response.status, 404);
    assertEquals(response.error, "Card not found");
  });

  await t.step("delete info card", async () => {
    // Setup
    const created = await callApi<BaseCard>("/cards/info/create", {
      method: 'POST',
      body: JSON.stringify({ name: "Test Delete Card" })
    }, "delete info card - setup");
    assert(created.data);
    
    const response = await callApi<{ success: boolean }>(`/cards/info/delete`, {
      method: 'POST',
      body: JSON.stringify({ cardId: created.data.id })
    }, "delete info card");
    assertEquals(response.status, 200);
    assert(response.data);
    assertEquals(response.data.success, true);
    
    // Verify deletion
    const getResponse = await callApi<BaseCard>(`/cards/info/api?cardId=${created.data.id}`, {
      method: 'GET'
    }, "delete info card - verify deletion");
    assertEquals(getResponse.status, 404);
    assertEquals(getResponse.error, "Card not found");
  });

  // Check for errors after all tests
  await checkForErrors();
}); 