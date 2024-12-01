import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions } from "./test_utils.ts";

const { User } = AiCommands;
const { assertSuccess, assertJson } = Assertions;

testSuite("User Operations", async (t) => {
  const testUser = {
    username: "test_user",
    email: "test@example.com",
    preferences: { theme: "dark" }
  };

  let userId: string;

  // Test user creation
  await t.step("create user", async () => {
    const { status, data } = await User.create(testUser);
    assertSuccess(status, data);
    assertJson(data);
    assertEquals(typeof data.id, "string");
    userId = data.id;
  });

  // Test getting user
  await t.step("get user", async () => {
    const { status, data } = await User.get(userId);
    assertSuccess(status, data);
    assertJson(data);
    assertEquals(data.username, testUser.username);
    assertEquals(data.email, testUser.email);
  });

  // Test updating user
  await t.step("update user", async () => {
    const updates = { preferences: { theme: "light" } };
    const { status, data } = await User.update(userId, updates);
    assertSuccess(status, data);
    assertEquals(data.preferences.theme, "light");
  });

  // Test user session
  await t.step("create session", async () => {
    const { status, data } = await User.createSession(userId);
    assertSuccess(status, data);
    assertEquals(typeof data.sessionId, "string");
  });

  // Test session validation
  await t.step("validate session", async () => {
    const { status, data } = await User.validateSession("test-session");
    assertEquals(status, 401);
    assertEquals(typeof data.error, "string");
  });

  // Test user deletion
  await t.step("delete user", async () => {
    const { status, data } = await User.delete(userId);
    assertSuccess(status, data);
    assertEquals(data.success, true);
  });
}); 