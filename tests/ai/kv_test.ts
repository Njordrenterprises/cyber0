import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions } from "./test_utils.ts";

const { Kv } = AiCommands;
const { assertSuccess, assertJson } = Assertions;

testSuite("KV Operations", async (t) => {
  // Test setting a value
  await t.step("set value", async () => {
    const { status, data } = await Kv.set("test-key", { value: "test" });
    assertSuccess(status, data);
    assertEquals(data.success, true);
  });

  // Test getting a value
  await t.step("get value", async () => {
    const { status, data } = await Kv.get("test-key");
    assertSuccess(status, data);
    assertJson(data);
    assertEquals(data.value, "test");
  });

  // Test listing values with prefix
  await t.step("list values", async () => {
    const { status, data } = await Kv.list("test");
    assertSuccess(status, data);
    assertJson(data);
    assertEquals(Array.isArray(data), true);
  });

  // Test deleting a value
  await t.step("delete value", async () => {
    const { status, data } = await Kv.delete("test-key");
    assertSuccess(status, data);
    assertEquals(data.success, true);
  });

  // Test getting non-existent value
  await t.step("get non-existent value", async () => {
    const { status, data } = await Kv.get("non-existent");
    assertEquals(status, 404);
    assertEquals(typeof data.error, "string");
  });

  // Test atomic operations
  await t.step("atomic operations", async () => {
    const { status, data } = await Kv.atomic([
      { type: "check", key: "test-key", versionstamp: null },
      { type: "set", key: "test-key", value: "new-value" }
    ]);
    assertSuccess(status, data);
    assertEquals(data.success, true);
  });
}); 