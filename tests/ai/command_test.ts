import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions, TestData } from "./test_utils.ts";
import type { CardCommand, CardResponse } from "../../db/client/types.ts";

const { Card } = AiCommands;
const { assertSuccess, assertError } = Assertions;
const { authors } = TestData;

testSuite("Command Operations", async (t) => {
  let testCardId: string;

  // Create a test card first
  await t.step("setup test card", async () => {
    const response = await Card.createCard("info", "Test Command Card");
    assertSuccess(response.status, response.data);
    testCardId = response.data.id;
  });

  // Test basic command execution
  await t.step("execute basic command", async () => {
    const command: CardCommand = {
      command: "echo",
      args: ["Hello, World!"],
      source: {
        id: authors.test.id,
        type: "human"
      },
      target: {
        cardId: testCardId,
        cardType: "info"
      }
    };

    const response = await Card.executeCommand(command);
    assertSuccess(response.status, response.data);
    const data = response.data as CardResponse;
    assertEquals(data.success, true);
    assertEquals(data.data, "Hello, World!");
  });

  // Test command with multiple arguments
  await t.step("execute command with multiple args", async () => {
    const command: CardCommand = {
      command: "add",
      args: [5, 3],
      source: {
        id: authors.test.id,
        type: "human"
      },
      target: {
        cardId: testCardId,
        cardType: "info"
      }
    };

    const response = await Card.executeCommand(command);
    assertSuccess(response.status, response.data);
    const data = response.data as CardResponse;
    assertEquals(data.success, true);
    assertEquals(data.data, 8);
  });

  // Test command with metadata
  await t.step("execute command with metadata", async () => {
    const command: CardCommand = {
      command: "timestamp",
      source: {
        id: authors.test.id,
        type: "human"
      },
      target: {
        cardId: testCardId,
        cardType: "info"
      },
      metadata: {
        timestamp: Date.now(),
        timezone: "UTC"
      }
    };

    const response = await Card.executeCommand(command);
    assertSuccess(response.status, response.data);
    const data = response.data as CardResponse;
    assertEquals(data.success, true);
    assertEquals(typeof data.data, "string");
    assertEquals(data.metadata?.timezone, "UTC");
  });

  // Test AI command execution
  await t.step("execute AI command", async () => {
    const command: CardCommand = {
      command: "analyze",
      args: ["Sample text for analysis"],
      source: {
        id: "ai-assistant",
        type: "ai"
      },
      target: {
        cardId: testCardId,
        cardType: "info"
      }
    };

    const response = await Card.executeCommand(command);
    assertSuccess(response.status, response.data);
    const data = response.data as CardResponse;
    assertEquals(data.success, true);
    assertEquals(typeof data.data, "object");
  });

  // Test command validation
  await t.step("validate command permissions", async () => {
    const command: CardCommand = {
      command: "admin",
      source: {
        id: authors.test.id,
        type: "human"
      },
      target: {
        cardId: testCardId,
        cardType: "info"
      }
    };

    const response = await Card.executeCommand(command);
    assertEquals(response.status, 403);
    assertError(response);
  });

  // Test error cases
  await t.step("execute non-existent command", async () => {
    const command: CardCommand = {
      command: "non-existent",
      source: {
        id: authors.test.id,
        type: "human"
      },
      target: {
        cardId: testCardId,
        cardType: "info"
      }
    };

    const response = await Card.executeCommand(command);
    assertEquals(response.status, 404);
    assertError(response);
  });

  await t.step("execute command on non-existent card", async () => {
    const command: CardCommand = {
      command: "echo",
      args: ["test"],
      source: {
        id: authors.test.id,
        type: "human"
      },
      target: {
        cardId: "non-existent",
        cardType: "info"
      }
    };

    const response = await Card.executeCommand(command);
    assertEquals(response.status, 404);
    assertError(response);
  });

  await t.step("execute command with invalid args", async () => {
    const command: CardCommand = {
      command: "add",
      args: ["not", "numbers"],
      source: {
        id: authors.test.id,
        type: "human"
      },
      target: {
        cardId: testCardId,
        cardType: "info"
      }
    };

    const response = await Card.executeCommand(command);
    assertEquals(response.status, 400);
    assertError(response);
  });

  // Cleanup
  await t.step("cleanup test card", async () => {
    const response = await Card.deleteCard("info", testCardId);
    assertSuccess(response.status, response.data);
    assertEquals(response.data.success, true);
  });
}); 