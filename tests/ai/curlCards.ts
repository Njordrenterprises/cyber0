import { assertEquals } from "jsr:@std/assert";

const BASE_URL = "http://localhost:8000";

Deno.test("Card Operations", async (t) => {
  let cardId = "";

  // Test creating a card
  await t.step("create card", async () => {
    const response = await fetch(`${BASE_URL}/cards/info/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test-card-1" })
    });

    assertEquals(response.status, 200);
    const data = await response.json();
    assertEquals(data.name, "test-card-1");
    assertEquals(data.type, "info");
    assertEquals(Array.isArray(data.messages), true);
    assertEquals(data.messages.length, 0);
    cardId = data.id;
  });

  // Test getting the card
  await t.step("get card", async () => {
    const response = await fetch(`${BASE_URL}/cards/info/${cardId}`);
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.id, cardId);
    assertEquals(data.name, "test-card-1");
    assertEquals(data.type, "info");
  });

  // Test updating the card
  await t.step("update card", async () => {
    const response = await fetch(`${BASE_URL}/cards/info/${cardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Updated content" })
    });

    assertEquals(response.status, 200);
    const data = await response.json();
    assertEquals(data.success, true);
  });

  // Test getting updated card
  await t.step("get updated card", async () => {
    const response = await fetch(`${BASE_URL}/cards/info/${cardId}`);
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.id, cardId);
    assertEquals(data.messages.length, 1);
    assertEquals(data.messages[0].text, "Updated content");
  });

  // Test deleting the card
  await t.step("delete card", async () => {
    const response = await fetch(`${BASE_URL}/cards/info/${cardId}`, {
      method: "DELETE"
    });

    assertEquals(response.status, 200);
    const data = await response.json();
    assertEquals(data.success, true);
  });

  // Test getting deleted card (should fail)
  await t.step("get deleted card", async () => {
    const response = await fetch(`${BASE_URL}/cards/info/${cardId}`);
    assertEquals(response.status, 500);
    await response.text();
  });

  // Test error cases
  await t.step("create card without name", async () => {
    const response = await fetch(`${BASE_URL}/cards/info/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    assertEquals(response.status, 400);
    const data = await response.json();
    assertEquals(data.error, "Name is required");
  });

  await t.step("get non-existent card", async () => {
    const response = await fetch(`${BASE_URL}/cards/info/non-existent-id`);
    assertEquals(response.status, 500);
    await response.text();
  });

  await t.step("update non-existent card", async () => {
    const response = await fetch(`${BASE_URL}/cards/info/non-existent-id`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Updated content" })
    });

    assertEquals(response.status, 404);
    await response.text();
  });

  await t.step("delete non-existent card", async () => {
    const response = await fetch(`${BASE_URL}/cards/info/non-existent-id`, {
      method: "DELETE"
    });

    assertEquals(response.status, 200);
    await response.text();
  });
}); 