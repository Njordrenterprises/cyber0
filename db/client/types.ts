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

export interface CardInfo {
  id: string;
  name: string;
  type: string;
  created: number;
}

export interface InfoCardMethods {
  kv: KvMethods;
  userId: string;
  handleKvUpdate: (cardId: string, newMessage: string) => Promise<void>;
  handleKvDelete: (cardId: string, messageId: string) => Promise<void>;
  loadCardMessages: (cardId: string) => Promise<CardMessage[]>;
}

export interface CardManagerMethods {
  addCard: (name: string, type: string) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  renameCard: (id: string, newName: string) => Promise<void>;
  getCards: () => Promise<CardInfo[]>;
}

export interface CardData {
  info: InfoCardMethods;
  cards: CardManagerMethods;
}

declare global {
  interface Window {
    cardData: CardData;
  }
} 