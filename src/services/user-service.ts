import { getKv } from '../../db/kv.ts';
import { generateUsername } from '../utils/username-generator.ts';
import { parse, serialize } from 'npm:hono@4.6.12/utils/cookie';
import { getUsernameColor } from '../utils/colors.ts';

const USER_COOKIE_NAME = 'cyber_user_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

interface User {
  id: string;
  username: string;
  color: string;
  created: number;
  lastSeen: number;
}

export async function getOrCreateUser(req: Request): Promise<{ user: User; response: Response }> {
  const kv = getKv();
  const cookies = parse(req.headers.get('cookie') || '');
  const userId = cookies[USER_COOKIE_NAME];

  let user: User;
  const response = new Response();

  if (userId) {
    // Try to get existing user
    const result = await kv.get<User>(['users', userId]);
    if (result.value) {
      // Update last seen
      user = {
        ...result.value,
        lastSeen: Date.now()
      };
      await kv.set(['users', userId], user);
      console.log('Existing User:', {
        id: user.id,
        username: user.username,
        color: user.color,
        created: new Date(user.created).toLocaleString(),
        lastSeen: new Date(user.lastSeen).toLocaleString()
      });
    } else {
      // User ID in cookie not found in KV, create new user
      const username = generateUsername();
      user = {
        id: crypto.randomUUID(),
        username,
        color: `hsl(${Math.abs(username.length * 137.508) % 360}, 85%, 75%)`,
        created: Date.now(),
        lastSeen: Date.now()
      };
      await kv.set(['users', user.id], user);
      console.log('New User (Cookie Not Found):', {
        id: user.id,
        username: user.username,
        color: user.color,
        created: new Date(user.created).toLocaleString(),
        lastSeen: new Date(user.lastSeen).toLocaleString()
      });
    }
  } else {
    // Create new user
    const username = generateUsername();
    user = {
      id: crypto.randomUUID(),
      username,
      color: `hsl(${Math.abs(username.length * 137.508) % 360}, 85%, 75%)`,
      created: Date.now(),
      lastSeen: Date.now()
    };
    await kv.set(['users', user.id], user);
    console.log('New User (No Cookie):', {
      id: user.id,
      username: user.username,
      color: user.color,
      created: new Date(user.created).toLocaleString(),
      lastSeen: new Date(user.lastSeen).toLocaleString()
    });
  }

  // Always set the cookie in the response
  const cookieValue = serialize(USER_COOKIE_NAME, user.id, {
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    maxAge: COOKIE_MAX_AGE
  });
  response.headers.set('Set-Cookie', cookieValue);

  return { user, response };
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