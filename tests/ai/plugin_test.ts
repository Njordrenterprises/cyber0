import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions, TestData } from "./test_utils.ts";
import type { CardPlugin, CardCommand, CardMessage, CardEvent } from "../../db/client/types.ts";

const { Card } = AiCommands;
const { assertSuccess, assertError } = Assertions;
const { authors } = TestData;

testSuite("Plugin Operations", async (t) => {
  let testCardId: string;

  // Test plugin registration
  await t.step("register plugin", async () => {
    const testPlugin: CardPlugin = {
      name: "test-plugin",
      version: "1.0.0",
      type: "info",
      
      async onLoad() {
        // Initialize plugin
      },
      
      async onMessage(message: CardMessage) {
        // Handle message
        if (message.type === 'command') {
          return {
            success: true,
            data: { processed: true }
          };
        }
      },
      
      async onCommand(command: CardCommand) {
        // Handle command
        return {
          success: true,
          data: { executed: true }
        };
      },
      
      async onEvent(event: CardEvent) {
        // Handle event
        if (event.type === 'card:message') {
          return;
        }
      }
    };

    const response = await Card.registerPlugin(testPlugin);
    assertSuccess(response.status, response.data);
    const data = response.data as { success: boolean };
    assertEquals(data.success, true);
  });

  // Test plugin state management
  await t.step("manage plugin state", async () => {
    const state = { counter: 0 };
    const setResponse = await Card.setPluginState("test-plugin", state);
    assertSuccess(setResponse.status, setResponse.data);
    
    const getResponse = await Card.getPluginState("test-plugin");
    assertSuccess(getResponse.status, getResponse.data);
    assertEquals(getResponse.data, state);
  });

  // Test plugin command execution
  await t.step("execute plugin command", async () => {
    const command: CardCommand = {
      command: "test",
      args: ["arg1", "arg2"],
      source: {
        id: authors.test.id,
        type: "human"
      },
      target: {
        cardId: testCardId,
        cardType: "info"
      },
      metadata: {
        timestamp: Date.now()
      }
    };

    const response = await Card.executeCommand(command);
    assertSuccess(response.status, response.data);
    const data = response.data as { success: boolean; data: { executed: boolean } };
    assertEquals(data.success, true);
    assertEquals(data.data.executed, true);
  });

  // Test plugin resource management
  await t.step("manage plugin resources", async () => {
    const resource = { template: "<div>Test</div>" };
    const setResponse = await Card.setPluginResource("test-plugin", "template", resource);
    assertSuccess(setResponse.status, setResponse.data);
    
    const getResponse = await Card.getPluginResource("test-plugin", "template");
    assertSuccess(getResponse.status, getResponse.data);
    assertEquals(getResponse.data, resource);
  });

  // Test plugin unregistration
  await t.step("unregister plugin", async () => {
    const response = await Card.unregisterPlugin("test-plugin");
    assertSuccess(response.status, response.data);
    const data = response.data as { success: boolean };
    assertEquals(data.success, true);

    // Verify plugin is unregistered
    const commandResponse = await Card.executeCommand({
      command: "test",
      source: {
        id: authors.test.id,
        type: "human"
      },
      target: {
        cardId: testCardId,
        cardType: "info"
      }
    });
    assertEquals(commandResponse.status, 404);
    assertError(commandResponse);
  });

  // Test error cases
  await t.step("register invalid plugin", async () => {
    const invalidPlugin = {
      name: "invalid-plugin",
      version: "1.0.0"
    };
    const response = await Card.registerPlugin(invalidPlugin as CardPlugin);
    assertEquals(response.status, 400);
    assertError(response);
  });

  await t.step("access unregistered plugin state", async () => {
    const response = await Card.getPluginState("non-existent-plugin");
    assertEquals(response.status, 404);
    assertError(response);
  });
}); 