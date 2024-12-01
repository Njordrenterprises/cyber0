import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions, TestData } from "./test_utils.ts";
import type { AnyEvent, CardEvent, UserEvent } from "../../db/client/types.ts";

const { Event, Card } = AiCommands;
const { assertSuccess, assertError } = Assertions;
const { users } = TestData;

testSuite("Event Operations", async (t) => {
  let connectionId: string;
  let testCardId: string;

  // Test event subscription
  await t.step("subscribe to events", async () => {
    const response = await Event.subscribe();
    assertSuccess(response.status, response.data);
    const data = response.data as { connectionId: string };
    assertEquals(typeof data.connectionId, "string");
    connectionId = data.connectionId;
  });

  // Test card events
  await t.step("receive card creation event", async () => {
    // Create a card
    const cardResponse = await Card.createCard("info", "Test Card");
    assertSuccess(cardResponse.status, cardResponse.data);
    testCardId = cardResponse.data.id;

    // Get event history
    const response = await Event.getHistory({ type: 'card:created' });
    assertSuccess(response.status, response.data);
    const events = response.data as AnyEvent[];
    
    // Verify event
    const event = events.find(e => {
      if (e.type === 'card:created') {
        const cardEvent = e as CardEvent;
        return cardEvent.payload.cardId === testCardId;
      }
      return false;
    });
    assertEquals(event !== undefined, true);
  });

  // Test user events
  await t.step("receive user update event", async () => {
    // Update user preferences
    const newPrefs = { 
      theme: 'light' as const,
      language: 'en',
      notifications: true
    };
    await AiCommands.User.update(users.test.id, { preferences: newPrefs });

    // Get event history
    const response = await Event.getHistory({ type: 'user:updated' });
    assertSuccess(response.status, response.data);
    const events = response.data as AnyEvent[];
    
    // Verify event
    const event = events.find(e => {
      if (e.type === 'user:updated') {
        const userEvent = e as UserEvent;
        return userEvent.payload.userId === users.test.id;
      }
      return false;
    });
    assertEquals(event !== undefined, true);
    if (event && event.type === 'user:updated') {
      assertEquals(event.payload.data.preferences?.theme, 'light');
    }
  });

  // Test event filtering
  await t.step("filter events by type", async () => {
    const response = await Event.getHistory({ type: 'card:created' });
    assertSuccess(response.status, response.data);
    const events = response.data as AnyEvent[];
    assertEquals(events.every(e => e.type === 'card:created'), true);
  });

  // Test event unsubscribe
  await t.step("unsubscribe from events", async () => {
    const response = await Event.unsubscribe(connectionId);
    assertSuccess(response.status, response.data);
    const data = response.data as { success: boolean };
    assertEquals(data.success, true);
  });

  // Test error cases
  await t.step("invalid event type", async () => {
    const response = await Event.publish({
      id: crypto.randomUUID(),
      type: 'card:created',
      timestamp: Date.now(),
      source: 'test',
      actor: {
        id: 'test-user',
        type: 'human'
      },
      payload: {
        cardId: 'test-card',
        cardType: 'info',
        data: {}
      }
    } as CardEvent);
    assertEquals(response.status, 400);
    assertError(response);
  });

  await t.step("unsubscribe with invalid connection", async () => {
    const response = await Event.unsubscribe("invalid-connection");
    assertEquals(response.status, 404);
    assertError(response);
  });
}); 