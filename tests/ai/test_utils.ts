import { assertEquals } from "jsr:@std/assert";
import type { User, BaseCard, CardMessage, CardAuthor } from "../../db/client/types.ts";

// Test environment configuration
const TEST_LOG_FILE = 'test-server.log';

export interface ApiResponse<T> {
  status: number;
  data: T;
  error?: string;
}

export const TestData = {
  users: {
    test: {
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
    } as User
  },
  authors: {
    test: {
      id: "test-user",
      username: "test_user",
      type: 'human' as const,
      color: "#ff0000",
      sprite: "👤"
    } as CardAuthor
  },
  cards: {
    info: {
      name: "Test Info Card",
      type: "info",
      content: {
        text: "Test content"
      },
      metadata: {
        version: "1.0.0",
        permissions: {
          canView: ['human', 'ai'],
          canEdit: ['human'],
          canDelete: ['human']
        }
      }
    }
  }
};

export const Assertions = {
  assertSuccess: (status: number, data: unknown) => {
    assertEquals(status >= 200 && status < 300, true);
    assertEquals(data !== null && data !== undefined, true);
  },
  assertError: (response: ApiResponse<unknown>) => {
    assertEquals(response.status >= 400, true);
    assertEquals(typeof response.error, "string");
  }
};

export function isBaseCard(obj: unknown): obj is BaseCard {
  if (!obj || typeof obj !== "object") return false;
  const card = obj as BaseCard;
  return (
    typeof card.id === "string" &&
    typeof card.type === "string" &&
    typeof card.name === "string" &&
    typeof card.created === "number" &&
    typeof card.lastUpdated === "number" &&
    card.createdBy !== undefined &&
    card.content !== undefined &&
    card.metadata !== undefined
  );
}

export function isCardMessage(obj: unknown): obj is CardMessage {
  if (!obj || typeof obj !== "object") return false;
  const msg = obj as CardMessage;
  return (
    typeof msg.id === "string" &&
    typeof msg.cardId === "string" &&
    typeof msg.content === "string" &&
    typeof msg.timestamp === "number" &&
    msg.author !== undefined &&
    typeof msg.type === "string"
  );
}

export async function setupTestEnvironment() {
  // Create/truncate test log file
  const logFile = await Deno.open(TEST_LOG_FILE, {
    write: true,
    create: true,
    truncate: true,
  });
  
  // Store original console methods
  const originalConsole = { ...console };

  // Redirect console output to log file
  const encoder = new TextEncoder();
  console.log = (...args) => {
    logFile.write(encoder.encode(`[LOG] ${args.join(' ')}\n`));
  };
  console.error = (...args) => {
    logFile.write(encoder.encode(`[ERROR] ${args.join(' ')}\n`));
  };
  console.warn = (...args) => {
    logFile.write(encoder.encode(`[WARN] ${args.join(' ')}\n`));
  };

  return { logFile, originalConsole };
}

export async function teardownTestEnvironment(env: { logFile: Deno.FsFile; originalConsole: typeof console }) {
  // Restore original console methods
  Object.assign(console, env.originalConsole);
  
  // Close log file
  await env.logFile.close();
  
  // Display test logs
  try {
    const logContents = await Deno.readTextFile(TEST_LOG_FILE);
    console.log('\nTest Server Logs:');
    console.log(logContents);
  } catch (error) {
    console.error('Error reading test logs:', error);
  }
}

export async function testSuite(name: string, fn: (t: Deno.TestContext) => Promise<void>): Promise<void> {
  Deno.test({
    name,
    sanitizeResources: false,
    sanitizeOps: false,
    fn
  });
} 