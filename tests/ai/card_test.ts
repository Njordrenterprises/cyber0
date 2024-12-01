import { assertEquals, assertExists } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, TestData, Assertions, isBaseCard, isCardMessage } from "./test_utils.ts";
import type { BaseCard, CardMessage } from "../../db/client/types.ts";

const { Card } = AiCommands;
const { assertSuccess, assertError } = Assertions;
const { cards, authors } = TestData;

testSuite("Card Operations", async (t) => {
  let testCardId: string;

  // Test card creation
  await t.step("create info card", async () => {
    const response = await Card.createCard("info", cards.info.name);
    assertSuccess(response.status, response.data);
    const data = response.data;
    
    // Verify card structure
    assertEquals(isBaseCard(data), true);
    const card = data as BaseCard;
    assertExists(card.id);
    assertEquals(card.name, cards.info.name);
    assertEquals(card.type, "info");
    assertEquals(typeof card.created, "number");
    assertEquals(card.createdBy.id, authors.test.id);
    assertEquals(card.createdBy.username, authors.test.username);
    
    testCardId = card.id;
  });

  // Test card listing
  await t.step("list info cards", async () => {
    const response = await Card.getCards("info");
    assertSuccess(response.status, response.data);
    const data = response.data;
    
    // Verify array of cards
    assertEquals(Array.isArray(data), true);
    assertEquals(data.every(isBaseCard), true);
    assertEquals(data.some((card: BaseCard) => card.id === testCardId), true);
  });

  // Test getting specific card
  await t.step("get info card", async () => {
    const response = await Card.getCard("info", testCardId);
    assertSuccess(response.status, response.data);
    const data = response.data;
    
    // Verify card data
    assertEquals(isBaseCard(data), true);
    const card = data as BaseCard;
    assertEquals(card.id, testCardId);
    assertEquals(card.name, cards.info.name);
    assertEquals(card.type, "info");
  });

  // Test adding message
  await t.step("add message to card", async () => {
    const text = "Test message";
    const response = await Card.sendMessage(testCardId, text);
    assertSuccess(response.status, response.data);
    const data = response.data;
    
    // Verify message structure
    assertEquals(isCardMessage(data), true);
    const message = data as CardMessage;
    assertEquals(message.content, text);
    assertEquals(message.author.id, authors.test.id);
    assertEquals(message.author.username, authors.test.username);
  });

  // Test listing messages
  await t.step("list card messages", async () => {
    const response = await Card.getMessages(testCardId);
    assertSuccess(response.status, response.data);
    const data = response.data;
    
    // Verify messages array
    assertEquals(Array.isArray(data), true);
    assertEquals(data.every(isCardMessage), true);
    assertEquals(data.length, 1);
    assertEquals(data[0].content, "Test message");
  });

  // Test error cases
  await t.step("create card with empty name", async () => {
    const response = await Card.createCard("info", "");
    assertEquals(response.status, 400);
    assertError(response);
  });

  await t.step("get non-existent card", async () => {
    const response = await Card.getCard("info", "non-existent-id");
    assertEquals(response.status, 404);
    assertError(response);
  });

  await t.step("add message to non-existent card", async () => {
    const response = await Card.sendMessage("non-existent-id", "test");
    assertEquals(response.status, 404);
    assertError(response);
  });

  // Test card deletion
  await t.step("delete info card", async () => {
    const response = await Card.deleteCard("info", testCardId);
    assertSuccess(response.status, response.data);
    const data = response.data as { success: boolean };
    assertEquals(data.success, true);

    // Verify deletion
    const getResponse = await Card.getCard("info", testCardId);
    assertEquals(getResponse.status, 404);
    assertError(getResponse);
  });
}); 