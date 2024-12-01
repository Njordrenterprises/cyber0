import { assertEquals, assertExists } from "jsr:@std/assert";

export interface TestContext extends Deno.TestContext {}

export interface ApiResponse {
  status: number;
  data: {
    html?: string;
    error?: string;
    [key: string]: unknown;
  };
}

export const testSuite = (name: string, fn: (t: TestContext) => Promise<void>) => {
  Deno.test(name, fn);
};

export const Assertions = {
  assertSuccess: (status: number, data: unknown): void => {
    assertEquals(status, 200);
    assertEquals(typeof data, "object");
    assertEquals(data !== null, true);
  },

  assertJson: (data: unknown): asserts data is Record<string, unknown> => {
    assertEquals(typeof data, "object");
    assertEquals(data !== null, true);
  },

  assertHtml: (data: ApiResponse): string => {
    const html = data.data.html;
    assertExists(html, "HTML content is missing");
    assertEquals(typeof html, "string");
    assertEquals(html.trim().startsWith("<"), true);
    return html;
  },

  assertError: (data: ApiResponse): string => {
    const error = data.data.error;
    assertExists(error, "Error message is missing");
    assertEquals(typeof error, "string");
    assertEquals(error.length > 0, true);
    return error;
  }
}; 