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
export interface BaseCardMethods {
  createCard: (name: string) => Promise<BaseCard>;
  deleteCard: (cardId: string) => Promise<void>;
  getCards: () => Promise<BaseCard[]>;
}

// Info card specific methods
export interface InfoCardMethods extends BaseCardMethods {
  kv: KvMethods;
  userId: string;
  handleKvUpdate: (cardId: string, newMessage: string) => Promise<void>;
  handleKvDelete: (cardId: string, messageId: string) => Promise<void>;
  loadCardMessages: (cardId: string) => Promise<CardMessage[]>;
}

export interface CardData {
  info: InfoCardMethods;
}

// Augment globalThis with our custom properties
declare global {
  interface UserContext {
    id: string;
    username: string;
    color: string;
    sprite: string;
    created: number;
    lastSeen: number;
  }

  interface UserWidget {
    init: () => Promise<UserContext | null>;
  }

  interface GlobalThis {
    userContext?: UserContext;
    userWidget?: UserWidget;
    cardData?: CardData;
  }
}

// Use this to access cardData in a cross-platform way
export const getCardData = (): CardData => {
  return globalThis.cardData!;
}; 