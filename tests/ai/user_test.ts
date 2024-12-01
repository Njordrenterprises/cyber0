import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions, TestData } from "./test_utils.ts";
import type { User } from "../../db/client/types.ts";

const { User } = AiCommands;
const { assertSuccess, assertError } = Assertions;
const { users } = TestData;

testSuite("User Operations", async (t) => {
  let userId: string;

  // Test user creation
  await t.step("create user", async () => {
    const testUser: Partial<User> = {
      name: "Test User",
      username: "test_user",
      email: "test@example.com",
      type: 'human' as const,
      color: "#ff0000",
      sprite: "👤",
      preferences: {
        theme: "dark" as const,
        language: "en",
        notifications: true
      },
      capabilities: {
        canCreateCards: true,
        canDeleteCards: true,
        canSendMessages: true,
        canModifyUsers: false,
        allowedCardTypes: ['info', 'test']
      }
    };

    const response = await User.update('new', testUser);
    assertSuccess(response.status, response.data);
    const data = response.data;
    
    // Verify user structure
    assertEquals(typeof data.id, "string");
    assertEquals(typeof data.created, "number");
    assertEquals(typeof data.lastSeen, "number");
    
    // Validate provided values are preserved
    assertEquals(data.name, testUser.name);
    assertEquals(data.username, testUser.username);
    assertEquals(data.email, testUser.email);
    assertEquals(data.color, testUser.color);
    assertEquals(data.sprite, testUser.sprite);
    assertEquals(data.preferences.theme, testUser.preferences?.theme);
    assertEquals(data.preferences.language, testUser.preferences?.language);
    assertEquals(data.preferences.notifications, testUser.preferences?.notifications);
    assertEquals(data.capabilities, testUser.capabilities);
    
    userId = data.id;
  });

  // Test getting user
  await t.step("get user", async () => {
    const response = await User.get(userId);
    assertSuccess(response.status, response.data);
    const data = response.data;
    assertEquals(data.id, userId);
  });

  // Test updating user
  await t.step("update user", async () => {
    const update: Partial<User> = {
      preferences: {
        theme: "light" as const,
        language: "es",
        notifications: false
      }
    };

    const response = await User.update(userId, update);
    assertSuccess(response.status, response.data);
    const data = response.data;
    assertEquals(data.preferences.theme, update.preferences?.theme);
    assertEquals(data.preferences.language, update.preferences?.language);
    assertEquals(data.preferences.notifications, update.preferences?.notifications);
  });

  // Test user session
  await t.step("create session", async () => {
    const response = await User.createSession(userId);
    assertSuccess(response.status, response.data);
    const data = response.data;
    assertEquals(typeof data.sessionId, "string");
    assertEquals(typeof data.cookie, "string");
    assertEquals(data.cookie.includes("userId="), true);
    assertEquals(data.cookie.includes("Path=/"), true);
  });

  // Test session validation
  await t.step("validate session", async () => {
    const response = await User.validateSession("test-session");
    assertEquals(response.status, 401);
    assertError(response);
  });

  // Test error cases
  await t.step("create user with invalid data", async () => {
    const invalidUser: Partial<User> = {
      email: "not-an-email"
    };
    const response = await User.update('new', invalidUser);
    assertEquals(response.status, 400);
    assertError(response);
  });

  // Test user deletion
  await t.step("delete user", async () => {
    const response = await User.delete(userId);
    assertSuccess(response.status, response.data);
    const data = response.data as { success: boolean };
    assertEquals(data.success, true);

    // Verify deletion
    const getResponse = await User.get(userId);
    assertEquals(getResponse.status, 404);
    assertError(getResponse);
  });
}); 