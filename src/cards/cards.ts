export { Card, type CardState, type CardKvEntry } from '../../db/card.ts';
import { getKv } from '../../db/kv.ts';
import { broadcast } from '../ws/broadcast.ts';

// Shared types for all cards
export interface BaseCard {
  id: string;
  name: string;
  type: string;
  created: number;
  createdBy: {
    id: string;
    username: string;
  };
}

export interface CardMessage {
  id: string;
  text: string;
  timestamp: number;
  author: {
    id: string;
    username: string;
  };
}

export interface CardEntry {
  messages: CardMessage[];
  cardId: string;
  timestamp: number;
  owner: {
    id: string;
    username: string;
  };
}

// Shared card management functions
export async function createCard(userId: string, username: string, name: string, type: string): Promise<BaseCard> {
  const listKey = ['cards', type, 'global', 'list']; // Fixed key format
  const kv = getKv();
  const result = await kv.get(listKey);
  const cards = result.value || [];

  const card: BaseCard = {
    id: crypto.randomUUID(),
    name,
    type,
    created: Date.now(),
    createdBy: {
      id: userId,
      username
    }
  };

  cards.push(card);
  await kv.set(listKey, cards);
  
  // Create initial card data
  const cardDataKey = ['cards', type, 'data', card.id]; // Fixed key format
  const initialData: CardEntry = {
    messages: [],
    cardId: card.id,
    timestamp: Date.now(),
    owner: {
      id: userId,
      username
    }
  };
  await kv.set(cardDataKey, initialData);
  
  // Broadcast card creation
  broadcast({
    type: 'update',
    key: listKey.join(','),
    value: cards
  });
  
  return card;
}

export async function deleteCard(userId: string, cardId: string, type: string): Promise<void> {
  const kv = getKv();
  
  // Get global list
  const listKey = ['cards', type, 'global', 'list'];
  const result = await kv.get(listKey);
  const cards = result.value || [];
  
  // Remove card from list without ownership check
  const updatedCards = cards.filter(c => c.id !== cardId);
  await kv.set(listKey, updatedCards);

  // Delete card data
  const cardDataKey = ['cards', type, 'data', cardId];
  await kv.delete(cardDataKey);
  
  // Broadcast card deletion
  broadcast({
    type: 'update',
    key: listKey.join(','),
    value: updatedCards
  });
}

export async function getCards(_userId: string, type: string): Promise<BaseCard[]> {
  const listKey = ['cards', type, 'global', 'list']; // Fixed key format
  const kv = getKv();
  const result = await kv.get(listKey);
  return (result.value || []).sort((a, b) => b.created - a.created);
}

export async function addMessage(userId: string, username: string, type: string, cardId: string, text: string): Promise<CardMessage> {
  const cardDataKey = ['cards', type, 'data', cardId];
  const kv = getKv();
  
  // Get current entry
  const result = await kv.get<CardEntry>(cardDataKey);
  let entry: CardEntry;
  
  if (!result.value) {
    // If no entry exists, get the card info from the list to set up initial data
    const listResult = await kv.get(['cards', type, 'global', 'list']);
    const card = listResult.value?.find(c => c.id === cardId);
    if (!card) throw new Error('Card not found');
    
    // Create new entry
    entry = {
      messages: [],
      cardId,
      timestamp: Date.now(),
      owner: card.createdBy
    };
    // Save the new entry
    await kv.set(cardDataKey, entry);
  } else {
    entry = result.value;
  }
  
  // Create new message
  const message: CardMessage = {
    id: crypto.randomUUID(),
    text,
    timestamp: Date.now(),
    author: {
      id: userId,
      username
    }
  };
  
  // Update entry with new message at start
  const updatedEntry: CardEntry = {
    ...entry,
    messages: [message, ...entry.messages],
    timestamp: Date.now()
  };
  
  // Save and broadcast card data update
  await kv.set(cardDataKey, updatedEntry);
  broadcast({
    type: 'update',
    key: cardDataKey.join(','),
    value: updatedEntry
  });
  
  // Also broadcast global list update to refresh all cards
  const listKey = ['cards', type, 'global', 'list'];
  const listResult = await kv.get(listKey);
  if (listResult.value) {
    broadcast({
      type: 'update',
      key: listKey.join(','),
      value: listResult.value
    });
  }
  
  return message;
}

export async function deleteMessage(userId: string, type: string, cardId: string, messageId: string): Promise<void> {
  const cardDataKey = ['cards', type, 'data', cardId];
  const kv = getKv();
  
  // Get current entry
  const result = await kv.get<CardEntry>(cardDataKey);
  if (!result.value) {
    throw new Error('Card not found');
  }
  
  // Update messages without ownership check
  const updatedEntry: CardEntry = {
    ...result.value,
    messages: result.value.messages.filter(m => m.id !== messageId),
    timestamp: Date.now()
  };
  
  // Save and broadcast card data update
  await kv.set(cardDataKey, updatedEntry);
  broadcast({
    type: 'update',
    key: cardDataKey.join(','),
    value: updatedEntry
  });
  
  // Also broadcast global list update to refresh all cards
  const listKey = ['cards', type, 'global', 'list'];
  const listResult = await kv.get(listKey);
  if (listResult.value) {
    broadcast({
      type: 'update',
      key: listKey.join(','),
      value: listResult.value
    });
  }
}
