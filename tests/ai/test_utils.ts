import { assertEquals } from "jsr:@std/assert";

export interface ApiResponse<T> {
  status: number;
  data: T;
  error?: string;
}

export const TestData = {
  authors: {
    test: {
      id: "test-user",
      username: "Test User",
      type: "human" as const,
      color: "#ff0000",
      sprite: "sprite1"
    }
  },
  cards: {
    info: {
      name: "Test Card",
      type: "info",
      content: {
        text: "Test content"
      },
      metadata: {
        version: "1.0.0",
        permissions: {
          canView: ["human", "ai"],
          canEdit: ["human"],
          canDelete: ["human"]
        }
      }
    }
  }
};

export const Assertions = {
  assertSuccess(status: number, data: unknown): void {
    assertEquals(status, 200);
    assertEquals(data !== null && data !== undefined, true);
  },

  assertError(response: ApiResponse<unknown>): void {
    assertEquals(response.status >= 400 && response.status < 600, true);
    assertEquals(typeof response.error, "string");
  }
};

export function testSuite(name: string, fn: (t: Deno.TestContext) => Promise<void>): void {
  Deno.test(name, async (t) => {
    try {
      await fn(t);
    } catch (error) {
      console.error(`Test suite "${name}" failed:`, error);
      throw error;
    }
  });
} 