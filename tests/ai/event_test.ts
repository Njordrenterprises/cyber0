import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions } from "./test_utils.ts";

const { Event } = AiCommands;
const { assertSuccess, assertJson } = Assertions;

testSuite("Event Operations", async (t) => {
  // Test event subscription
  await t.step("subscribe to events", async () => {
    const { status, data } = await Event.subscribe();
    assertSuccess(status, data);
    assertEquals(typeof data.connectionId, "string");
  });

  // Test event publishing
  await t.step("publish event", async () => {
    const testEvent = {
      type: "test",
      payload: { message: "test event" }
    };
    const { status, data } = await Event.publish(testEvent);
    assertSuccess(status, data);
    assertEquals(data.success, true);
  });

  // Test event history
  await t.step("get event history", async () => {
    const { status, data } = await Event.getHistory();
    assertSuccess(status, data);
    assertJson(data);
    assertEquals(Array.isArray(data), true);
  });

  // Test event filtering
  await t.step("filter events", async () => {
    const { status, data } = await Event.filter({ type: "test" });
    assertSuccess(status, data);
    assertJson(data);
    assertEquals(Array.isArray(data), true);
    assertEquals(data.every((event: unknown) => 
      typeof event === "object" && 
      event !== null && 
      "type" in event && 
      (event as { type: string }).type === "test"
    ), true);
  });

  // Test event unsubscribe
  await t.step("unsubscribe from events", async () => {
    const { status, data } = await Event.unsubscribe("test-connection");
    assertSuccess(status, data);
    assertEquals(data.success, true);
  });

  // Test invalid event publish
  await t.step("publish invalid event", async () => {
    const { status, data } = await Event.publish({
      type: "", // Empty type
      payload: {}
    });
    assertEquals(status, 400);
    assertEquals(typeof data.error, "string");
  });
}); 