export interface KvMethods {
  get: <T>(key: unknown[]) => Promise<T | null>;
  set: (key: unknown[], value: unknown) => Promise<void>;
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

export interface BaseCard {
  id: string;
  name: string;
  type: string;
  created: number;
}

// Shared card methods that all cards will have
export interface CardMethods {
  createCard: (name: string) => Promise<BaseCard>;
  deleteCard: (cardId: string) => Promise<void>;
  getCards: () => Promise<BaseCard[]>;
}

// Info card specific methods
export interface InfoCardMethods extends CardMethods {
  kv: KvMethods;
  userId: string;
  handleKvUpdate: (cardId: string, newMessage: string) => Promise<void>;
  handleKvDelete: (cardId: string, messageId: string) => Promise<void>;
  loadCardMessages: (cardId: string) => Promise<CardMessage[]>;
}

// Test card specific methods
export interface TestCardMethods extends CardMethods {
  // Add any test-specific methods here
}

export interface CardData {
  info?: InfoCardMethods;
  test?: TestCardMethods;
}

// User context types
export interface UserContext {
  id: string;
  username: string;
  color: string;
  sprite: string;
  created: number;
  lastSeen: number;
}

export interface UserWidget {
  init: () => Promise<UserContext | null>;
}

// Augment the global scope
declare global {
  interface Window {
    cardData: CardData;
    userContext: UserContext;
    userWidget: UserWidget;
  }

  // Make Window properties available in globalThis
  const cardData: CardData;
  const userContext: UserContext;
  const userWidget: UserWidget;
}

// Use this to access cardData in a cross-platform way
export const getCardData = (): CardData => {
  return (globalThis as unknown as Window).cardData;
}; 