import { assertEquals, assert } from "jsr:@std/assert";
import type { Message, BaseCard } from "../../db/client/types.ts";

interface MessageState extends Omit<BaseCard, 'metadata'> {
  messages: Message[];
  threads: Array<{
    id: string;
    messages: Message[];
    lastActivity: number;
  }>;
  metadata: {
    version: string;
    schema: string;
    messageCount: number;
    threadCount: number;
    lastMessageTime: number;
    permissions: {
      canView: ('human' | 'ai' | string)[];
      canEdit: ('human' | 'ai' | string)[];
      canDelete: ('human' | 'ai' | string)[];
      canReact: string[];
    };
  };
}

const API_BASE = "http://localhost:8000";
const LOG_FILE = "message_test.log";

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

Deno.test("Message Card Operations", async (t) => {
  // Clear log file at start
  await Deno.writeTextFile(LOG_FILE, '');

  await t.step("create message card", async () => {
    const response = await callApi<MessageState>("/cards/message/create", {
      method: 'POST',
      body: JSON.stringify({})
    }, "create message card");

    assertEquals(response.status, 200);
    assert(response.data);
    assert(response.data.metadata);
    assertEquals(response.data.messages.length, 0);
    assertEquals(response.data.threads.length, 0);
    assertEquals(response.data.metadata.messageCount, 0);
    assertEquals(response.data.metadata.threadCount, 0);
    assertEquals(response.data.metadata.schema, 'message-card-v1');

    // Cleanup
    await callApi(`/cards/message/${response.data.id}`, {
      method: 'DELETE'
    }, "create message card - cleanup");
  });

  await t.step("list messages", async () => {
    // Setup - create card and add messages
    const created = await callApi<MessageState>("/cards/message/create", {
      method: 'POST',
      body: JSON.stringify({})
    }, "list messages - setup");
    assert(created.data);

    await callApi<Message>("/cards/message/api", {
      method: 'POST',
      body: JSON.stringify({
        cardId: created.data.id,
        content: "Test message 1",
        type: "text"
      })
    }, "list messages - setup");

    await callApi<Message>("/cards/message/api", {
      method: 'POST',
      body: JSON.stringify({
        cardId: created.data.id,
        content: "Test message 2",
        type: "text"
      })
    }, "list messages - setup");

    // Get messages
    const response = await callApi<Message[]>(`/cards/message/api/messages?cardId=${created.data.id}`, {
      method: 'GET'
    }, "list messages");

    assertEquals(response.status, 200);
    assert(response.data);
    assert(Array.isArray(response.data));
    assert(response.data.length >= 2);
    assert(response.data.every((msg: Message) => msg.id && msg.content && msg.type));

    // Cleanup
    await callApi(`/cards/message/${created.data.id}`, {
      method: 'DELETE'
    }, "list messages - cleanup");
  });

  await t.step("get message card", async () => {
    // Setup
    const created = await callApi<MessageState>("/cards/message/create", {
      method: 'POST',
      body: JSON.stringify({})
    }, "get message card - setup");
    assert(created.data);

    const response = await callApi<MessageState>(`/cards/message/${created.data.id}`, {
      method: 'GET'
    }, "get message card");

    assertEquals(response.status, 200);
    assert(response.data);
    assert(response.data.metadata);
    assertEquals(response.data.messages.length, 0);
    assertEquals(response.data.threads.length, 0);

    // Cleanup
    await callApi(`/cards/message/${created.data.id}`, {
      method: 'DELETE'
    }, "get message card - cleanup");
  });

  await t.step("send message", async () => {
    // Setup
    const created = await callApi<MessageState>("/cards/message/create", {
      method: 'POST',
      body: JSON.stringify({})
    }, "send message - setup");
    assert(created.data);

    const response = await callApi<Message>("/cards/message/api", {
      method: 'POST',
      body: JSON.stringify({
        cardId: created.data.id,
        content: "Test message content",
        type: "text"
      })
    }, "send message");

    assertEquals(response.status, 200);
    assert(response.data);
    assert(response.data.id);
    assertEquals(response.data.content, "Test message content");
    assertEquals(response.data.type, "text");

    // Cleanup
    await callApi(`/cards/message/${created.data.id}`, {
      method: 'DELETE'
    }, "send message - cleanup");
  });

  await t.step("send threaded message", async () => {
    // Setup
    const created = await callApi<MessageState>("/cards/message/create", {
      method: 'POST',
      body: JSON.stringify({})
    }, "threaded message - setup");
    assert(created.data);

    // Create parent message
    const parent = await callApi<Message>("/cards/message/api", {
      method: 'POST',
      body: JSON.stringify({
        cardId: created.data.id,
        content: "Parent message",
        type: "text"
      })
    }, "threaded message - setup");
    assert(parent.data);

    // Send reply
    const response = await callApi<Message>("/cards/message/api", {
      method: 'POST',
      body: JSON.stringify({
        cardId: created.data.id,
        content: "Reply message",
        type: "text",
        parentId: parent.data.id
      })
    }, "send threaded message");

    assertEquals(response.status, 200);
    assert(response.data);
    assertEquals(response.data.content, "Reply message");
    assertEquals(response.data.parentId, parent.data.id);

    // Cleanup
    await callApi(`/cards/message/${created.data.id}`, {
      method: 'DELETE'
    }, "threaded message - cleanup");
  });

  await t.step("send message to non-existent card", async () => {
    const response = await callApi<Message>("/cards/message/api", {
      method: 'POST',
      body: JSON.stringify({
        cardId: "non-existent-id",
        content: "Test message",
        type: "text"
      })
    }, "send to non-existent card");

    assertEquals(response.status, 404);
    assertEquals(response.error, "Card not found");
  });

  await t.step("send message without content", async () => {
    // Setup
    const created = await callApi<MessageState>("/cards/message/create", {
      method: 'POST',
      body: JSON.stringify({})
    }, "message without content - setup");
    assert(created.data);

    const response = await callApi<Message>("/cards/message/api", {
      method: 'POST',
      body: JSON.stringify({
        cardId: created.data.id,
        type: "text"
      })
    }, "send message without content");

    assertEquals(response.status, 400);
    assertEquals(response.error, "Message content is required");

    // Cleanup
    await callApi(`/cards/message/${created.data.id}`, {
      method: 'DELETE'
    }, "message without content - cleanup");
  });

  await t.step("delete message card", async () => {
    // Setup
    const created = await callApi<MessageState>("/cards/message/create", {
      method: 'POST',
      body: JSON.stringify({})
    }, "delete message card - setup");
    assert(created.data);

    const response = await callApi<{ success: boolean }>(`/cards/message/${created.data.id}`, {
      method: 'DELETE'
    }, "delete message card");

    assertEquals(response.status, 200);
    assert(response.data);
    assertEquals(response.data.success, true);

    // Verify deletion
    const getResponse = await callApi<MessageState>(`/cards/message/${created.data.id}`, {
      method: 'GET'
    }, "delete message card - verify");
    assertEquals(getResponse.status, 404);
    assertEquals(getResponse.error, "Card not found");
  });

  // Check for errors after all tests
  await checkForErrors();
}); 