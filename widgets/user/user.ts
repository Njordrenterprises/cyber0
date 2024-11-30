import { getKv } from '../../db/kv.ts';

interface User {
  id: string;
  username: string;
  color: string;
  sprite: string;
  created: number;
  lastSeen: number;
}

export async function getUserData(userId: string): Promise<User | null> {
  const kv = getKv();
  const result = await kv.get<User>(['users', userId]);
  console.log('Widget fetched user data:', result.value);
  return result.value;
}

export function getUserWidgetScript(): string {
  return `
    globalThis.userWidget = {
      async init() {
        const userId = globalThis.userContext?.id;
        if (!userId) return null;
        
        try {
          const response = await fetch('/widgets/user/data?userId=' + userId);
          const userData = await response.json();
          console.log('User widget data:', userData);
          return userData;
        } catch (error) {
          console.error('Error fetching user data:', error);
          return null;
        }
      }
    };
  `;
}
