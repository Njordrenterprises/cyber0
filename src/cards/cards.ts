import { getValue, setValue, deleteValue } from '../../db/core/kv.ts';
import { broadcast } from '../ws/broadcast.ts';
import { sendNotification } from '../services/notification-service.ts';

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
  const listKey = ['cards', type, 'global', 'list'];
  
  // Get existing cards
  const cards = await getValue<Card[]>(listKey) || [];
  
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
  await setValue(listKey, cards);
  
  // Create initial card data
  const cardData: CardData = {
    messages: []
  };
  await setValue(['cards', type, 'data', card.id], cardData);
  
  // Broadcast update
  broadcast({
    type: 'update',
    key: listKey.join(','),
    value: cards
  });
  
  // Send notification to others
  sendNotification('', {
    title: `${username} created ${name}`
  });
  
  return card;
}

export async function deleteCard(_userId: string, cardId: string, type: string): Promise<void> {
  // Get global list
  const listKey = ['cards', type, 'global', 'list'];
  const cards = await getValue<Card[]>(listKey) || [];
  
  // Get card info before deletion
  const card = cards.find(c => c.id === cardId);
  
  // Remove card from list without ownership check
  const updatedCards = cards.filter((c: Card) => c.id !== cardId);
  await setValue(listKey, updatedCards);

  // Delete card data
  const cardDataKey = ['cards', type, 'data', cardId];
  await deleteValue(cardDataKey);
  
  // Broadcast card deletion
  broadcast({
    type: 'update',
    key: listKey.join(','),
    value: updatedCards
  });

  // Send notification to others if we found the card
  if (card) {
    sendNotification('', {
      title: `${card.createdBy.username} deleted ${card.name}`
    });
  }
}

export async function getCards(_userId: string, type: string): Promise<Card[]> {
  const listKey = ['cards', type, 'global', 'list'];
  const cards = await getValue<Card[]>(listKey) || [];
  return cards.sort((a: Card, b: Card) => b.created - a.created);
}

export async function addMessage(userId: string, username: string, type: string, cardId: string, text: string, color: string, sprite: string): Promise<CardMessage> {
  const dataKey = ['cards', type, 'data', cardId];
  
  // Get card info for notification
  const listKey = ['cards', type, 'global', 'list'];
  const cards = await getValue<Card[]>(listKey) || [];
  const card = cards.find(c => c.id === cardId);
  
  // Get current entry
  const cardData = await getValue<CardData>(dataKey) || { messages: [] };

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
  await setValue(dataKey, updatedData);
  broadcast({
    type: 'update',
    key: dataKey.join(','),
    value: updatedData
  });

  // Send notification to others
  if (card) {
    sendNotification('', {
      title: `${username} messaged ${card.name}`
    });
  }

  return message;
}

export async function deleteMessage(_userId: string, type: string, cardId: string, messageId: string): Promise<void> {
  const dataKey = ['cards', type, 'data', cardId];
  
  // Get current entry
  const cardData = await getValue<CardData>(dataKey);
  if (!cardData) {
    throw new Error('Card not found');
  }

  // Get message before deletion
  const message = cardData.messages.find(m => m.id === messageId);
  
  // Update messages without ownership check
  const updatedData: CardData = {
    messages: cardData.messages.filter(m => m.id !== messageId)
  };

  // Save and broadcast card data update
  await setValue(dataKey, updatedData);
  broadcast({
    type: 'update',
    key: dataKey.join(','),
    value: updatedData
  });

  // Send notification to others if we found the message
  if (message) {
    sendNotification('', {
      title: `${message.author.username} deleted message`
    });
  }
}
