import { setupTestEnvironment, teardownTestEnvironment } from "./test_utils.ts";

// Import all test suites
import "./card_test.ts";
import "./kv_test.ts";
import "./view_test.ts";
import "./user_test.ts";
import "./event_test.ts";

// Main setup and teardown
Deno.test({
  name: "AI Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    try {
      console.log("\nSetting up test environment...");
      await setupTestEnvironment();
      console.log("Test environment ready.\n");

      // Individual test suites are run automatically
      // due to the imports above

    } finally {
      console.log("\nCleaning up test environment...");
      await teardownTestEnvironment();
      console.log("Cleanup complete.\n");
    }
  },
}); 