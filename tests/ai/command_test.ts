import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions, TestData } from "./test_utils.ts";
import type { CardCommand } from "../../db/client/types.ts";

const { Card } = AiCommands;
const { assertSuccess, assertError } = Assertions;
const { authors } = TestData;

testSuite("Card Commands", async (t) => {
  let testCardId = "";

  await t.step("create test card", async () => {
    const { status, data } = await Card.create("info", { name: "Test Command Card" });
    assertSuccess(status, data);
    testCardId = data.id;
  });

  await t.step("execute help command", async () => {
    const command: CardCommand = {
      command: "help",
      source: authors.test,
      target: {
        cardId: testCardId,
        cardType: "info"
      }
    };

    const { status, data } = await Card.command("info", testCardId, command);
    assertSuccess(status, data);
    assertEquals(data.success, true);
  });

  await t.step("execute invalid command", async () => {
    const command: CardCommand = {
      command: "invalid",
      source: authors.test,
      target: {
        cardId: testCardId,
        cardType: "info"
      }
    };

    const { status, error } = await Card.command("info", testCardId, command);
    assertError(status);
    assertEquals(error, "Invalid command");
  });

  await t.step("execute command on non-existent card", async () => {
    const command: CardCommand = {
      command: "help",
      source: authors.test,
      target: {
        cardId: "non-existent",
        cardType: "info"
      }
    };

    const { status, error } = await Card.command("info", "non-existent", command);
    assertError(status);
    assertEquals(error, "Card not found");
  });

  await t.step("cleanup", async () => {
    const { status, data } = await Card.delete("info", testCardId);
    assertSuccess(status, data);
  });
}); 