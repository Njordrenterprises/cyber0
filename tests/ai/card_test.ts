import { assertEquals, assertExists } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, TestData, Assertions } from "./test_utils.ts";

const { Card } = AiCommands;
const { assertSuccess } = Assertions;
const { cards } = TestData;

testSuite("Card Operations", async (t) => {
  let testCardId: string;

  // Test card creation
  await t.step("create info card", async () => {
    const { status, data } = await Card.createCard("info", cards.info.name);
    assertSuccess(status, data);
    assertExists(data.id);
    assertEquals(data.name, cards.info.name);
    testCardId = data.id;
  });

  // Test card listing
  await t.step("list info cards", async () => {
    const { status, data } = await Card.listCards("info");
    assertSuccess(status, data);
    assertEquals(Array.isArray(data), true);
    assertEquals(data.some(card => card.id === testCardId), true);
  });

  // Test template retrieval
  await t.step("get info card template", async () => {
    const { status, data } = await Card.getTemplate("info");
    assertSuccess(status, data);
    assertEquals(typeof data, "string");
    assertEquals(data.includes("info-card"), true);
  });

  // Test card deletion
  await t.step("delete info card", async () => {
    const { status, data } = await Card.deleteCard("info", testCardId);
    assertSuccess(status, data);
    assertEquals(data.success, true);

    // Verify deletion
    const { data: listData } = await Card.listCards("info");
    assertEquals(listData.some(card => card.id === testCardId), false);
  });

  // Test error cases
  await t.step("create card with empty name", async () => {
    const { status, data } = await Card.createCard("info", "");
    assertEquals(status, 400);
    assertEquals(typeof data.error, "string");
  });

  await t.step("delete non-existent card", async () => {
    const { status, data } = await Card.deleteCard("info", "non-existent-id");
    assertEquals(status, 404);
    assertEquals(typeof data.error, "string");
  });

  await t.step("get template for non-existent card type", async () => {
    const { status, data } = await Card.getTemplate("non-existent");
    assertEquals(status, 404);
    assertEquals(typeof data.error, "string");
  });
}); 