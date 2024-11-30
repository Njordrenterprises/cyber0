import { getKv } from '../../db/kv.ts';
import { generateUsername } from '../utils/username-generator.ts';
import { parse, serialize } from 'npm:hono@4.6.12/utils/cookie';

const USER_COOKIE_NAME = 'cyber_user_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

interface User {
  id: string;
  username: string;
  created: number;
  lastSeen: number;
}

export async function getOrCreateUser(req: Request): Promise<{ user: User; response?: Response }> {
  const kv = getKv();
  const cookies = parse(req.headers.get('cookie') || '');
  const userId = cookies[USER_COOKIE_NAME];

  if (userId) {
    // Try to get existing user
    const result = await kv.get<User>(['users', userId]);
    if (result.value) {
      // Update last seen
      const updatedUser = {
        ...result.value,
        lastSeen: Date.now()
      };
      await kv.set(['users', userId], updatedUser);
      return { user: updatedUser };
    }
  }

  // Create new user
  const newUser: User = {
    id: crypto.randomUUID(),
    username: generateUsername(),
    created: Date.now(),
    lastSeen: Date.now()
  };

  // Save user to KV
  await kv.set(['users', newUser.id], newUser);

  // Create response with cookie
  const response = new Response();
  const cookieValue = serialize(USER_COOKIE_NAME, newUser.id, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: COOKIE_MAX_AGE
  });
  response.headers.set('Set-Cookie', cookieValue);

  return { user: newUser, response };
}

export async function getUserById(userId: string): Promise<User | null> {
  const kv = getKv();
  const result = await kv.get<User>(['users', userId]);
  return result.value || null;
}

export async function updateUserLastSeen(userId: string): Promise<void> {
  const kv = getKv();
  const result = await kv.get<User>(['users', userId]);
  if (result.value) {
    await kv.set(['users', userId], {
      ...result.value,
      lastSeen: Date.now()
    });
  }
} 