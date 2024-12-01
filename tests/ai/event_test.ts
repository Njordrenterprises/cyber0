import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions, TestData } from "./test_utils.ts";
import type { CardEvent } from "../../db/client/types.ts";

const { Card } = AiCommands;
const { assertSuccess, assertError } = Assertions;
const { authors } = TestData;

testSuite("Card Events", async (t) => {
  let testCardId = "";

  await t.step("create test card", async () => {
    const { status, data } = await Card.create("info", { name: "Test Event Card" });
    assertSuccess(status, data);
    testCardId = data.id;
  });

  await t.step("emit card event", async () => {
    const event: CardEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      source: "test",
      actor: {
        id: authors.test.id,
        type: "human"
      },
      type: "card:updated",
      payload: {
        cardId: testCardId,
        cardType: "info",
        data: { updated: true }
      }
    };

    const { status, data } = await Card.event("info", testCardId, event);
    assertSuccess(status, data);
    assertEquals(data.success, true);
  });

  await t.step("emit event to non-existent card", async () => {
    const event: CardEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      source: "test",
      actor: {
        id: authors.test.id,
        type: "human"
      },
      type: "card:updated",
      payload: {
        cardId: "non-existent",
        cardType: "info",
        data: { updated: true }
      }
    };

    const { status, error } = await Card.event("info", "non-existent", event);
    assertError(status);
    assertEquals(error, "Card not found");
  });

  await t.step("cleanup", async () => {
    const { status, data } = await Card.delete("info", testCardId);
    assertSuccess(status, data);
  });
}); 