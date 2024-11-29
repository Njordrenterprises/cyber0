export { Card, type CardState, type CardKvEntry } from '../../db/card.ts';
import { getKv } from '../../db/kv.ts';

// Shared types for all cards
export interface BaseCard {
  id: string;
  name: string;
  type: string;
  created: number;
}

// Shared card management functions
export async function createCard(userId: string, name: string, type: string): Promise<BaseCard> {
  const key = ['cards', type, userId, 'list'];
  const kv = getKv();
  const result = await kv.get<BaseCard[]>(key);
  const cards = result.value || [];

  const card: BaseCard = {
    id: crypto.randomUUID(),
    name,
    type,
    created: Date.now()
  };

  cards.push(card);
  await kv.set(key, cards);
  return card;
}

export async function deleteCard(userId: string, cardId: string, type: string): Promise<void> {
  const kv = getKv();
  
  // Delete from list
  const listKey = ['cards', type, userId, 'list'];
  const result = await kv.get<BaseCard[]>(listKey);
  const cards = result.value || [];
  await kv.set(listKey, cards.filter(c => c.id !== cardId));

  // Delete card data
  const dataKey = ['cards', type, userId, cardId];
  await kv.delete(dataKey);
}

export async function getCards(userId: string, type: string): Promise<BaseCard[]> {
  const key = ['cards', type, userId, 'list'];
  const kv = getKv();
  const result = await kv.get<BaseCard[]>(key);
  return (result.value || []).sort((a, b) => b.created - a.created);
}
