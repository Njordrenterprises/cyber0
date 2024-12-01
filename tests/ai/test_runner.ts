import { setupTestEnvironment, teardownTestEnvironment } from "./test_utils.ts";

// Import all test suites
import "./card_test.ts";
import "./kv_test.ts";
import "./view_test.ts";
import "./user_test.ts";
import "./event_test.ts";
import "./plugin_test.ts";
import "./command_test.ts";

// Main setup and teardown
Deno.test({
  name: "AI Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn(t) {
    let env;
    try {
      console.log("\nSetting up test environment...");
      env = await setupTestEnvironment();
      console.log("Test environment ready.\n");

      // Run each test suite
      await t.step("Card Tests", async () => {
        await import("./card_test.ts");
      });

      await t.step("KV Tests", async () => {
        await import("./kv_test.ts");
      });

      await t.step("View Tests", async () => {
        await import("./view_test.ts");
      });

      await t.step("User Tests", async () => {
        await import("./user_test.ts");
      });

      await t.step("Event Tests", async () => {
        await import("./event_test.ts");
      });

      await t.step("Plugin Tests", async () => {
        await import("./plugin_test.ts");
      });

      await t.step("Command Tests", async () => {
        await import("./command_test.ts");
      });

    } finally {
      if (env) {
        console.log("\nCleaning up test environment...");
        await teardownTestEnvironment(env);
        console.log("Cleanup complete.\n");
      }
    }
  },
}); 