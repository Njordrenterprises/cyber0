import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions } from "./test_utils.ts";
import type { KvKey, User } from "../../db/client/types.ts";

const { Kv } = AiCommands;
const { assertSuccess, assertError } = Assertions;

testSuite("KV Operations", async (t) => {
  const testKey: KvKey = ['users', 'test-user', 'data'];
  const testValue = { name: "test", value: 123 };

  // Test setting a value
  await t.step("set value", async () => {
    const response = await Kv.set(testKey, testValue);
    assertSuccess(response.status, response.data);
    const data = response.data as { success: boolean };
    assertEquals(data.success, true);
  });

  // Test getting a value
  await t.step("get value", async () => {
    const response = await Kv.get<typeof testValue>(testKey);
    assertSuccess(response.status, response.data);
    assertEquals(response.data, testValue);
  });

  // Test listing values
  await t.step("list values", async () => {
    const response = await Kv.list<typeof testValue>(['users', 'test-user']);
    assertSuccess(response.status, response.data);
    assertEquals(Array.isArray(response.data), true);
    assertEquals(response.data.length > 0, true);
    assertEquals(response.data[0], testValue);
  });

  // Test atomic operations
  await t.step("atomic operations", async () => {
    const newValue = { name: "updated", value: 456 };
    const response = await Kv.atomic([
      { type: 'check', key: testKey },
      { type: 'set', key: testKey, value: newValue }
    ]);
    assertSuccess(response.status, response.data);
    const data = response.data as { success: boolean };
    assertEquals(data.success, true);

    // Verify the update
    const getResponse = await Kv.get<typeof newValue>(testKey);
    assertSuccess(getResponse.status, getResponse.data);
    assertEquals(getResponse.data, newValue);
  });

  // Test error cases
  await t.step("get non-existent value", async () => {
    const response = await Kv.get<User>(['users', 'non-existent']);
    assertSuccess(response.status, response.data);
    assertEquals(response.data, null);
  });

  await t.step("invalid atomic operation", async () => {
    const response = await Kv.atomic([
      { type: 'check', key: ['sessions', 'invalid-session'] as KvKey },
      { type: 'set', key: ['sessions', 'invalid-session'] as KvKey, value: {} }
    ]);
    assertEquals(response.status, 400);
    assertError(response);
  });

  // Test deleting a value
  await t.step("delete value", async () => {
    const response = await Kv.delete(testKey);
    assertSuccess(response.status, response.data);
    const data = response.data as { success: boolean };
    assertEquals(data.success, true);

    // Verify deletion
    const getResponse = await Kv.get(testKey);
    assertSuccess(getResponse.status, getResponse.data);
    assertEquals(getResponse.data, null);
  });
}); 