import { assertEquals } from "jsr:@std/assert";
import { AiCommands } from "./curl_commands.ts";
import { testSuite, Assertions } from "./test_utils.ts";
import type { User } from "../../db/client/types.ts";

const { User } = AiCommands;
const { assertSuccess, assertError } = Assertions;

testSuite("User Operations", async (t) => {
  let testUserId = "";

  await t.step("create user", async () => {
    const { status, data } = await User.create({
      name: "Test User",
      username: "test_user",
      email: "test@example.com",
      type: "human",
      color: "#ff0000",
      sprite: "sprite1"
    });
    assertSuccess(status, data);
    assertEquals(data.name, "Test User");
    assertEquals(data.username, "test_user");
    assertEquals(data.email, "test@example.com");
    testUserId = data.id;
  });

  await t.step("get user", async () => {
    const { status, data } = await User.get(testUserId);
    assertSuccess(status, data);
    assertEquals(data.id, testUserId);
    assertEquals(data.name, "Test User");
    assertEquals(data.username, "test_user");
  });

  await t.step("update user", async () => {
    const { status, data } = await User.update(testUserId, {
      name: "Updated User",
      preferences: {
        theme: "light",
        language: "en",
        notifications: true
      }
    });
    assertSuccess(status, data);
    assertEquals(data.name, "Updated User");
    assertEquals(data.preferences.theme, "light");
  });

  await t.step("delete user", async () => {
    const { status, data } = await User.delete(testUserId);
    assertSuccess(status, data);
    assertEquals(data.success, true);
  });

  await t.step("create user with invalid data", async () => {
    const { status, error } = await User.create({
      name: "",
      username: "",
      email: "invalid",
      type: "human",
      color: "#ff0000",
      sprite: "sprite1"
    });
    assertError(status);
    assertEquals(error, "Invalid user data");
  });

  await t.step("get non-existent user", async () => {
    const { status, error } = await User.get("non-existent");
    assertError(status);
    assertEquals(error, "User not found");
  });
}); 