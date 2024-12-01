import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions } from "./test_utils.ts";
import type { User } from "../../db/client/types.ts";

const { View } = AiCommands;
const { assertSuccess, assertError } = Assertions;

testSuite("View Operations", async (t) => {
  const mockUser: User = {
    id: "test-user",
    name: "Test User",
    username: "test_user",
    email: "test@example.com",
    type: 'human' as const,
    color: "#ff0000",
    sprite: "👤",
    created: Date.now(),
    lastSeen: Date.now(),
    sessionId: "test-session",
    cookie: "userId=test-user; Path=/; HttpOnly; SameSite=Lax",
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

  // Test home view
  await t.step("get home view", async () => {
    const response = await View.getView("home", mockUser);
    assertSuccess(response.status, response.data);
    const html = response.data;
    
    // Verify basic structure
    assertEquals(typeof html, "string");
    assertEquals(html.includes("<!DOCTYPE html>"), true);
    assertEquals(html.includes("<html>"), true);
    assertEquals(html.includes("</html>"), true);
    
    // Verify user context
    assertEquals(html.includes("window.userContext = "), true);
    assertEquals(html.includes(mockUser.id), true);
    assertEquals(html.includes(mockUser.username), true);
    assertEquals(html.includes(mockUser.email), true);
  });

  // Test user widget
  await t.step("get user widget", async () => {
    const response = await View.getWidget("user-profile", mockUser);
    assertSuccess(response.status, response.data);
    const html = response.data;
    
    // Verify basic structure
    assertEquals(typeof html, "string");
    assertEquals(html.includes("<div"), true);
    assertEquals(html.includes("</div>"), true);
    
    // Verify user data rendering
    assertEquals(html.includes(mockUser.username), true);
    assertEquals(html.includes(mockUser.sprite), true);
    assertEquals(html.includes(mockUser.color), true);
  });

  // Test error cases
  await t.step("get non-existent view", async () => {
    const response = await View.getView("non-existent", mockUser);
    assertEquals(response.status, 404);
    assertError(response);
  });

  await t.step("get view without user", async () => {
    const response = await View.getView("home", null as unknown as User);
    assertEquals(response.status, 401);
    assertError(response);
  });

  // Test view with all user data
  await t.step("verify all user data in view", async () => {
    const response = await View.getView("user-settings", mockUser);
    assertSuccess(response.status, response.data);
    const html = response.data;
    
    // Verify all user fields are included
    assertEquals(html.includes(mockUser.username), true);
    assertEquals(html.includes(mockUser.email), true);
    assertEquals(html.includes(mockUser.color), true);
    assertEquals(html.includes(mockUser.sprite), true);
    assertEquals(html.includes(mockUser.preferences.theme), true);
    assertEquals(html.includes(mockUser.preferences.language), true);
    assertEquals(html.includes(String(mockUser.preferences.notifications)), true);
    
    // Verify user context is properly set
    const userContextMatch = html.match(/window\.userContext = (.*?);/);
    if (userContextMatch) {
      const userContext = JSON.parse(userContextMatch[1]) as User;
      assertEquals(userContext.id, mockUser.id);
      assertEquals(userContext.username, mockUser.username);
      assertEquals(userContext.email, mockUser.email);
      assertEquals(userContext.preferences.theme, mockUser.preferences.theme);
      assertEquals(userContext.preferences.language, mockUser.preferences.language);
    } else {
      throw new Error("User context not found in view");
    }
  });
}); 