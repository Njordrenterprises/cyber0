import { assertEquals, assert } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions } from "./test_utils.ts";
import type { BaseCard, CardMessage } from "../../db/client/types.ts";

const { Card } = AiCommands;
const { assertSuccess, assertError } = Assertions;

testSuite("Card Operations", async (t) => {
  let testCardId = "";

  await t.step("create info card", async () => {
    const { status, data } = await Card.create("info", { name: "Test Card" });
    assertSuccess(status, data);
    assert(data.id);
    assertEquals(data.name, "Test Card");
    assertEquals(data.type, "info");
    testCardId = data.id;
  });

  await t.step("list info cards", async () => {
    const { status, data } = await Card.list("info");
    assertSuccess(status, data);
    assert(Array.isArray(data));
    assert(data.length > 0);
    assert(data.every((card: BaseCard) => card.id && card.name && card.type));
  });

  await t.step("get info card", async () => {
    const { status, data } = await Card.get("info", testCardId);
    assertSuccess(status, data);
    assert(data.id);
    assertEquals(data.id, testCardId);
    assertEquals(data.name, "Test Card");
    assertEquals(data.type, "info");
  });

  await t.step("add message to card", async () => {
    const { status, data } = await Card.addMessage("info", testCardId, "Test message");
    assertSuccess(status, data);
    assert(data.id);
    assertEquals(data.cardId, testCardId);
    assertEquals(data.content, "Test message");
  });

  await t.step("list card messages", async () => {
    const { status, data } = await Card.getMessages("info", testCardId);
    assertSuccess(status, data);
    assert(Array.isArray(data));
    assert(data.length > 0);
    assert(data.every((msg: CardMessage) => msg.id && msg.cardId && msg.content));
  });

  await t.step("create card with empty name", async () => {
    const { status, error } = await Card.create("info", { name: "" });
    assertError(status);
    assertEquals(error, "Name is required");
  });

  await t.step("get non-existent card", async () => {
    const { status, error } = await Card.get("info", "non-existent");
    assertError(status);
    assertEquals(error, "Card not found");
  });

  await t.step("add message to non-existent card", async () => {
    const { status, error } = await Card.addMessage("info", "non-existent", "Test message");
    assertError(status);
    assertEquals(error, "Card not found");
  });

  await t.step("delete info card", async () => {
    const { status, data } = await Card.delete("info", testCardId);
    assertSuccess(status, data);
    assertEquals(data.success, true);
  });
}); 