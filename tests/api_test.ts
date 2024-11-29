import { assertEquals, assertExists, assert } from "https://deno.land/std@0.220.1/assert/mod.ts";

const BASE_URL = "http://localhost:8000";

// Helper function for making requests
async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  // Always read the response body to prevent resource leaks
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

// Test suite for API endpoints
Deno.test("API Endpoint Tests", async (t) => {
  // Store created card ID for subsequent tests
  let createdCardId = "";

  // Test card creation
  await t.step("POST /cards/info/create - should create a new card", async () => {
    const { status, data } = await makeRequest("/cards/info/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Card" }),
    });

    assertEquals(status, 200);
    assertExists(data.id);
    assertEquals(data.name, "Test Card");
    assertEquals(data.type, "info");
    createdCardId = data.id;
  });

  // Test card list retrieval
  await t.step("GET /cards/info/list - should list all cards", async () => {
    const { status, data } = await makeRequest("/cards/info/list");
    assertEquals(status, 200);
    assertEquals(Array.isArray(data), true);
  });

  // Test message addition
  await t.step("POST /cards/info/message/add - should add message to card", async () => {
    const { status, data } = await makeRequest("/cards/info/message/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        cardId: createdCardId,
        text: "Test Message"
      }),
    });

    assertEquals(status, 200);
    assertExists(data.id);
    assertEquals(data.text, "Test Message");
  });

  // Test message deletion
  await t.step("POST /cards/info/message/delete - should delete message", async () => {
    // First create a message
    const { status: _addStatus, data: message } = await makeRequest("/cards/info/message/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        cardId: createdCardId,
        text: "Message to Delete"
      }),
    });

    // Then delete it
    const { status } = await makeRequest("/cards/info/message/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        cardId: createdCardId,
        messageId: message.id
      }),
    });

    assertEquals(status, 200);
  });

  // Test card deletion
  await t.step("POST /cards/info/delete - should delete card", async () => {
    const { status } = await makeRequest("/cards/info/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: createdCardId }),
    });

    assertEquals(status, 200);
  });
});

// Security test suite
Deno.test("Security Tests", async (t) => {
  await t.step("POST /cards/info/create - should reject invalid content type", async () => {
    const { status } = await makeRequest("/cards/info/create", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "invalid data",
    });
    assertEquals(status, 400);
  });

  await t.step("POST /cards/info/create - should validate input", async () => {
    const { status } = await makeRequest("/cards/info/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: "data" }),
    });
    assertEquals(status, 400);
  });

  await t.step("POST /cards/info/message/add - should reject invalid card ID", async () => {
    const { status } = await makeRequest("/cards/info/message/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        cardId: "invalid-id",
        text: "Test Message"
      }),
    });
    assertEquals(status, 404);
  });

  await t.step("KV operations - should prevent path traversal", async () => {
    const { status } = await makeRequest("/kv/get?key=../system/sensitive");
    assertEquals(status, 400);
  });

  // Test rate limiting (if implemented)
  await t.step("Rate limiting - should handle rapid requests", async () => {
    const requests = Array(10).fill(null).map(() => 
      makeRequest("/cards/info/list")
    );
    const responses = await Promise.all(requests);
    responses.forEach(({ status }) => {
      assert(status === 200 || status === 429);
    });
  });
});

// WebSocket/SSE test suite
Deno.test("Real-time Updates", async (t) => {
  await t.step("SSE connection - should establish connection", async () => {
    const _events: string[] = [];
    const eventSource = new EventSource(`${BASE_URL}/events`);
    let timeoutId: number;
    
    try {
      await new Promise<void>((resolve, reject) => {
        eventSource.onopen = () => {
          resolve();
        };
        eventSource.onerror = (error) => {
          reject(error);
        };
        timeoutId = setTimeout(() => {
          reject(new Error("SSE connection timeout"));
        }, 5000);
      });
    } finally {
      clearTimeout(timeoutId!);
      eventSource.close();
    }
  });

  await t.step("Broadcast - should receive updates", async () => {
    const _events: string[] = [];
    const eventSource = new EventSource(`${BASE_URL}/events`);
    let timeoutId: number;
    
    try {
      // Create a card to trigger a broadcast
      await makeRequest("/cards/info/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Broadcast Test Card" }),
      });
      
      await new Promise<void>((resolve, reject) => {
        eventSource.onmessage = (event) => {
          _events.push(event.data);
          resolve();
        };
        timeoutId = setTimeout(() => {
          reject(new Error("Broadcast timeout"));
        }, 5000);
      });
      
      assertEquals(_events.length > 0, true);
    } finally {
      clearTimeout(timeoutId!);
      eventSource.close();
    }
  });
}); 