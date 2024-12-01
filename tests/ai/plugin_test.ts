import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions, TestData } from "./test_utils.ts";
import type { CardPlugin, CardCommand } from "../../db/client/types.ts";

const { Card } = AiCommands;
const { assertSuccess, assertError } = Assertions;
const { authors } = TestData;

testSuite("Card Plugins", async (t) => {
  const testPlugin: CardPlugin = {
    name: "test-plugin",
    version: "1.0.0",
    type: "test",
    onLoad: () => {
      console.log("Test plugin loaded");
    },
    onUnload: () => {
      console.log("Test plugin unloaded");
    },
    onMessage: (message) => {
      console.log("Processing message:", message);
    },
    onCommand: (command) => {
      console.log("Processing command:", command);
      return Promise.resolve({ success: true, data: { processed: true } });
    },
    onEvent: (event) => {
      console.log("Processing event:", event);
    }
  };

  await t.step("register plugin", async () => {
    const response = await Card.plugin<{ success: boolean }>("register", testPlugin);
    assertSuccess(response.status, response.data);
    assertEquals(response.data.success, true);
  });

  await t.step("get plugin state", async () => {
    const response = await Card.plugin<{ state: unknown }>("getState", testPlugin.name);
    assertSuccess(response.status, response.data);
    assertEquals(response.data.state !== undefined, true);
  });

  await t.step("set plugin state", async () => {
    const state = { counter: 42 };
    const response = await Card.plugin<{ success: boolean }>("setState", testPlugin.name, state);
    assertSuccess(response.status, response.data);
    assertEquals(response.data.success, true);
  });

  await t.step("execute plugin command", async () => {
    const command: CardCommand = {
      command: "test",
      source: authors.test,
      target: {
        cardId: "test",
        cardType: "test"
      }
    };

    const response = await Card.plugin<{ success: boolean }>("command", testPlugin.name, command);
    assertSuccess(response.status, response.data);
    assertEquals(response.data.success, true);
  });

  await t.step("unregister plugin", async () => {
    const response = await Card.plugin<{ success: boolean }>("unregister", testPlugin.name);
    assertSuccess(response.status, response.data);
    assertEquals(response.data.success, true);
  });

  await t.step("register invalid plugin", async () => {
    const invalidPlugin = {
      name: "invalid-plugin",
      version: "1.0.0"
    };

    const response = await Card.plugin<{ success: boolean }>("register", invalidPlugin);
    assertError(response);
    assertEquals(response.error, "Invalid plugin");
  });

  await t.step("get non-existent plugin state", async () => {
    const response = await Card.plugin<{ success: boolean }>("getState", "non-existent");
    assertError(response);
    assertEquals(response.error, "Plugin not found");
  });
}); 