import { getKv } from '../../db/kv.ts';
import { generateUsername } from '../utils/username-generator.ts';
import { parse, serialize } from 'npm:hono@4.6.12/utils/cookie';
import { getUsernameColor } from '../utils/colors.ts';
import { getRandomSprite } from '../utils/sprites.ts';

const USER_COOKIE_NAME = 'cyber_user_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

interface User {
  id: string;
  username: string;
  color: string;
  sprite: string;
  created: number;
  lastSeen: number;
}

export async function getOrCreateUser(req: Request): Promise<{ user: User; response: Response }> {
  const kv = getKv();
  const cookieHeader = req.headers.get('cookie');
  console.log('Cookie header:', cookieHeader);  // Debug log
  
  const cookies = parse(cookieHeader || '');
  const userId = cookies[USER_COOKIE_NAME];
  console.log('Parsed userId from cookie:', userId);  // Debug log

  let user: User;
  const response = new Response();

  // Only try to get existing user if we have a valid UUID
  if (userId && userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
    // Try to get existing user
    const result = await kv.get<User>(['users', userId]);
    if (result.value) {
      // Update last seen
      user = {
        ...result.value,
        lastSeen: Date.now()
      };
      await kv.set(['users', userId], user);
      console.log('Found existing user:', user);
    } else {
      console.log('Cookie exists but no user found, creating new');
      user = await createNewUser();
    }
  } else {
    console.log('No valid cookie, creating new user');
    user = await createNewUser();
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

async function createNewUser(): Promise<User> {
  const username = generateUsername();
  const user: User = {
    id: crypto.randomUUID(),
    username,
    color: `hsl(${Math.abs(username.length * 137.508) % 360}, 85%, 75%)`,
    sprite: getRandomSprite(),
    created: Date.now(),
    lastSeen: Date.now()
  };
  const kv = getKv();
  await kv.set(['users', user.id], user);
  console.log('Created new user:', user);
  return user;
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