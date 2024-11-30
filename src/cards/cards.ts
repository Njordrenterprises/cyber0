import { getKv } from '../../db/kv.ts';
import { broadcast } from '../ws/broadcast.ts';

export interface Card {
  id: string;
  name: string;
  type: string;
  created: number;
  createdBy: {
    id: string;
    username: string;
    color: string;
    sprite: string;
  };
}

export interface CardMessage {
  id: string;
  text: string;
  timestamp: number;
  author: {
    id: string;
    username: string;
    color: string;
    sprite: string;
  };
}

export interface CardData {
  messages: CardMessage[];
}

export async function createCard(userId: string, username: string, type: string, name: string, color: string, sprite: string): Promise<Card> {
  const kv = getKv();
  const listKey = ['cards', type, 'global', 'list'];
  
  // Get existing cards
  const result = await kv.get<Card[]>(listKey);
  const cards: Card[] = result.value || [];
  
  // Create new card
  const card: Card = {
    id: crypto.randomUUID(),
    name,
    type,
    created: Date.now(),
    createdBy: {
      id: userId,
      username,
      color,
      sprite
    }
  };
  
  cards.push(card);
  await kv.set(listKey, cards);
  
  // Create initial card data
  const cardData: CardData = {
    messages: []
  };
  await kv.set(['cards', type, 'data', card.id], cardData);
  
  // Broadcast update
  broadcast({
    type: 'update',
    key: listKey.join(','),
    value: cards
  });
  
  return card;
}

export async function deleteCard(_userId: string, cardId: string, type: string): Promise<void> {
  const kv = getKv();
  
  // Get global list
  const listKey = ['cards', type, 'global', 'list'];
  const result = await kv.get<Card[]>(listKey);
  const cards = result.value || [];
  
  // Remove card from list without ownership check
  const updatedCards = cards.filter((c: Card) => c.id !== cardId);
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

export async function getCards(_userId: string, type: string): Promise<Card[]> {
  const listKey = ['cards', type, 'global', 'list']; // Fixed key format
  const kv = getKv();
  const result = await kv.get<Card[]>(listKey);
  return (result.value || []).sort((a: Card, b: Card) => b.created - a.created);
}

export async function addMessage(userId: string, username: string, type: string, cardId: string, text: string, color: string, sprite: string): Promise<CardMessage> {
  const kv = getKv();
  const dataKey = ['cards', type, 'data', cardId];
  
  // Get current entry
  const result = await kv.get<CardData>(dataKey);
  let cardData = result.value;
  
  if (!cardData) {
    // If no entry exists, get the card info from the list to set up initial data
    const listResult = await kv.get<Card[]>(['cards', type, 'global', 'list']);
    const card = listResult.value?.find((c: Card) => c.id === cardId);
    if (!card) throw new Error('Card not found');
    
    // Create new entry
    cardData = {
      messages: []
    };
  }

  // Create message
  const message: CardMessage = {
    id: crypto.randomUUID(),
    text,
    timestamp: Date.now(),
    author: {
      id: userId,
      username,
      color,
      sprite
    }
  };

  // Update entry with new message at start
  const updatedData: CardData = {
    messages: [message, ...cardData.messages]
  };

  // Save and broadcast card data update
  await kv.set(dataKey, updatedData);
  broadcast({
    type: 'update',
    key: dataKey.join(','),
    value: updatedData
  });

  return message;
}

export async function deleteMessage(_userId: string, type: string, cardId: string, messageId: string): Promise<void> {
  const kv = getKv();
  const dataKey = ['cards', type, 'data', cardId];
  
  // Get current entry
  const result = await kv.get<CardData>(dataKey);
  if (!result.value) {
    throw new Error('Card not found');
  }
  
  // Update messages without ownership check
  const updatedData: CardData = {
    messages: result.value.messages.filter(m => m.id !== messageId)
  };

  // Save and broadcast card data update
  await kv.set(dataKey, updatedData);
  broadcast({
    type: 'update',
    key: dataKey.join(','),
    value: updatedData
  });
}
