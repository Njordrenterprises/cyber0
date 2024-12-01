import { getValue, setValue } from '../../db/core/kv.ts';

export interface User {
  id: string;
  username: string;
  color: string;
  sprite: string;
  created: number;
  lastSeen: number;
}

export async function getOrCreateUser(req: Request): Promise<{ user: User; response?: Response }> {
  // Get user ID from cookie
  const cookie = req.headers.get('cookie');
  const userId = cookie?.match(/userId=([^;]+)/)?.[1];

  if (userId) {
    // Get existing user
    const user = await getValue<User>(['users', userId]);
    if (user) {
      return { user };
    }
  }

  // Create new user
  const newUser: User = {
    id: crypto.randomUUID(),
    username: `User${Math.floor(Math.random() * 10000)}`,
    color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
    sprite: `sprite${Math.floor(Math.random() * 10) + 1}`,
    created: Date.now(),
    lastSeen: Date.now()
  };

  await setValue(['users', newUser.id], newUser);

  // Set cookie
  const response = new Response(null);
  response.headers.set('Set-Cookie', `userId=${newUser.id}; Path=/; HttpOnly; SameSite=Lax`);

  return { user: newUser, response };
}

export async function updateUserLastSeen(userId: string): Promise<void> {
  const user = await getValue<User>(['users', userId]);
  if (user) {
    user.lastSeen = Date.now();
    await setValue(['users', userId], user);
  }
} 