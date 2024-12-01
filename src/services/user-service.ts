import { kv } from '../../db/core/kv.ts';
import { getValue, setValue, atomic } from '../../db/core/kv.ts';
import type { User, Session } from '../../db/client/types.ts';

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export type { User }; // Re-export for convenience

export async function getOrCreateUser(req: Request): Promise<{ user: User; response?: Response }> {
  // Get user ID from cookie
  const cookie = req.headers.get('cookie');
  const userId = cookie?.match(/userId=([^;]+)/)?.[1];

  if (userId) {
    // Get existing user
    const user = await getValue<User>(['users', userId]);
    if (user) {
      // Update session if needed
      if (!user.sessionId || !user.cookie) {
        const session = await createSession(user.id);
        user.sessionId = session.sessionId;
        user.cookie = session.cookie;
        await setValue(['users', user.id], user);
      }
      return { user };
    }
  }

  // Create new user
  const newUser: User = {
    id: crypto.randomUUID(),
    username: `User${Math.floor(Math.random() * 10000)}`,
    email: '', // Will be set by user later
    color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
    sprite: `sprite${Math.floor(Math.random() * 10) + 1}`,
    created: Date.now(),
    lastSeen: Date.now(),
    preferences: {
      theme: 'dark' as const,
      language: 'en'
    }
  };

  // Create session
  const session = await createSession(newUser.id);
  newUser.sessionId = session.sessionId;
  newUser.cookie = session.cookie;

  // Save user
  await setValue(['users', newUser.id], newUser);

  // Set cookie
  const response = new Response(null);
  response.headers.set('Set-Cookie', session.cookie);

  return { user: newUser, response };
}

async function createSession(userId: string): Promise<{ sessionId: string; cookie: string }> {
  const sessionId = crypto.randomUUID();
  const created = Date.now();
  const expires = created + SESSION_DURATION;
  const cookie = `userId=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION/1000}`;

  const session: Session = {
    sessionId,
    userId,
    created,
    expires,
    cookie
  };

  await setValue(['sessions', sessionId], session);
  return { sessionId, cookie };
}

export async function validateSession(sessionId: string): Promise<boolean> {
  const session = await getValue<Session>(['sessions', sessionId]);
  if (!session) return false;

  // Check if session is expired
  if (Date.now() > session.expires) {
    await atomic()
      .delete(['sessions', sessionId])
      .commit();
    return false;
  }

  return true;
}

export async function updateUserLastSeen(userId: string): Promise<void> {
  const user = await getValue<User>(['users', userId]);
  if (user) {
    user.lastSeen = Date.now();
    await setValue(['users', userId], user);
  }
}

export async function updateUserPreferences(userId: string, preferences: Partial<User['preferences']>): Promise<void> {
  const user = await getValue<User>(['users', userId]);
  if (user) {
    user.preferences = { ...user.preferences, ...preferences };
    await setValue(['users', userId], user);
  }
}

export async function cleanupExpiredSessions(): Promise<void> {
  const now = Date.now();
  const sessionList = await kv.list<Session>({ prefix: ['sessions'] });
  
  for await (const entry of sessionList) {
    const session = entry.value;
    if (now > session.expires) {
      await atomic()
        .delete(['sessions', session.sessionId])
        .commit();
    }
  }
} 