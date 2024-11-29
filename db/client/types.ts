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

export interface InfoCardMethods {
  kv: KvMethods;
  userId: string;
  handleKvUpdate: (cardId: string, newMessage: string) => Promise<void>;
  handleKvDelete: (cardId: string, messageId: string) => Promise<void>;
  loadCardMessages: (cardId: string) => Promise<CardMessage[]>;
}

export interface CardData {
  info: InfoCardMethods;
}

// This creates a unified type that works in both Deno and browser
declare global {
  interface Window extends Record<string, unknown> {
    cardData: CardData;
  }
  
  var cardData: CardData;
}

// Use this to access cardData in a cross-platform way
export const getCardData = (): CardData => {
  if (typeof window !== 'undefined') {
    return (window as Window).cardData;
  }
  return globalThis.cardData;
}; 