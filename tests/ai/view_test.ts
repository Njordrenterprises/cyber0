import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions, type TestContext, type ApiResponse } from "./test_utils.ts";

const { View } = AiCommands;
const { assertSuccess, assertHtml, assertError } = Assertions;

// Mock user for tests
const mockUser = {
  id: "test-user",
  username: "Test User",
  color: "#ff0000",
  sprite: "sprite1",
  created: Date.now(),
  lastSeen: Date.now()
};

testSuite("View Operations", async (t: TestContext) => {
  // Test getting home view
  await t.step("get home view", async () => {
    const response = await View.getView("home", mockUser) as ApiResponse;
    assertSuccess(response.status, response.data);
    const html = assertHtml(response);
    assertEquals(html.includes("user-widget"), true);
    assertEquals(html.includes("cards-container"), true);
  });

  // Test getting non-existent view
  await t.step("get non-existent view", async () => {
    const response = await View.getView("non-existent", mockUser) as ApiResponse;
    assertEquals(response.status, 404);
    assertError(response);
  });

  // Test getting user widget
  await t.step("get user widget", async () => {
    const response = await View.getWidget("user", mockUser) as ApiResponse;
    assertSuccess(response.status, response.data);
    const html = assertHtml(response);
    assertEquals(html.includes("user-widget"), true);
  });

  // Test getting non-existent widget
  await t.step("get non-existent widget", async () => {
    const response = await View.getWidget("non-existent", mockUser) as ApiResponse;
    assertEquals(response.status, 404);
    assertError(response);
  });

  // Test view content types
  await t.step("verify content types", async () => {
    const response = await fetch("http://localhost:8000/views/home");
    assertEquals(response.headers.get("Content-Type"), "application/json");
  });

  // Test widget content types
  await t.step("verify widget content types", async () => {
    const response = await fetch("http://localhost:8000/widgets/user");
    assertEquals(response.headers.get("Content-Type"), "application/json");
  });

  // Test view caching
  await t.step("verify cache headers", async () => {
    const response = await fetch("http://localhost:8000/views/home");
    assertEquals(response.headers.get("Cache-Control"), "no-cache");
  });

  // Test widget error response format
  await t.step("verify error response format", async () => {
    const response = await View.getWidget("invalid-widget", mockUser) as ApiResponse;
    assertEquals(response.status, 404);
    assertError(response);
  });
}); 