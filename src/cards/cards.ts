export { Card, type CardState, type CardKvEntry } from '../../db/card.ts';
import { getKv } from '../../db/kv.ts';
import { broadcast } from '../ws/broadcast.ts';

// Shared types for all cards
export interface BaseCard {
  id: string;
  name: string;
  type: string;
  created: number;
}

export interface CardMessage {
  id: string;
  text: string;
  timestamp: number;
}

export interface CardEntry {
  messages: CardMessage[];
  cardId: string;
  timestamp: number;
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
  
  // Broadcast card creation
  await broadcast({
    type: 'update',
    key: key.join(','),
    value: cards
  });
  
  return card;
}

export async function deleteCard(userId: string, cardId: string, type: string): Promise<void> {
  const kv = getKv();
  
  // Delete from list
  const listKey = ['cards', type, userId, 'list'];
  const result = await kv.get<BaseCard[]>(listKey);
  const cards = result.value || [];
  const updatedCards = cards.filter(c => c.id !== cardId);
  await kv.set(listKey, updatedCards);

  // Delete card data
  const dataKey = ['cards', type, userId, cardId];
  await kv.delete(dataKey);
  
  // Broadcast card deletion
  await broadcast({
    type: 'update',
    key: listKey.join(','),
    value: updatedCards
  });
}

export async function getCards(userId: string, type: string): Promise<BaseCard[]> {
  const key = ['cards', type, userId, 'list'];
  const kv = getKv();
  const result = await kv.get<BaseCard[]>(key);
  return (result.value || []).sort((a, b) => b.created - a.created);
}

// Message management functions
export async function addMessage(userId: string, type: string, cardId: string, text: string): Promise<CardMessage> {
  const key = ['cards', type, userId, cardId];
  const kv = getKv();
  
  // Get current entry
  const result = await kv.get<CardEntry>(key);
  const entry = result.value || { messages: [], cardId, timestamp: Date.now() };
  
  // Create new message
  const message: CardMessage = {
    id: crypto.randomUUID(),
    text,
    timestamp: Date.now()
  };
  
  // Update entry with new message at start
  const updatedEntry: CardEntry = {
    messages: [message, ...entry.messages],
    cardId,
    timestamp: Date.now()
  };
  
  // Save and broadcast
  await kv.set(key, updatedEntry);
  await broadcast({
    type: 'update',
    key: key.join(','),
    value: updatedEntry
  });
  
  return message;
}

export async function deleteMessage(userId: string, type: string, cardId: string, messageId: string): Promise<void> {
  const key = ['cards', type, userId, cardId];
  const kv = getKv();
  
  // Get current entry
  const result = await kv.get<CardEntry>(key);
  if (!result.value) return;
  
  // Update messages
  const updatedEntry: CardEntry = {
    ...result.value,
    messages: result.value.messages.filter(m => m.id !== messageId),
    timestamp: Date.now()
  };
  
  // Save and broadcast
  await kv.set(key, updatedEntry);
  await broadcast({
    type: 'update',
    key: key.join(','),
    value: updatedEntry
  });
}
