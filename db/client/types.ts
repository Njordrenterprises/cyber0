import type { User } from '../../src/services/user-service.ts';

// Core Types
export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  type: 'human' | 'ai';
  
  // Appearance
  color: string;
  sprite: string;
  
  // Authentication & Session
  sessionId?: string;
  cookie?: string;
  
  // Timestamps
  created: number;
  lastSeen: number;
  
  // Preferences & Capabilities
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    notifications?: boolean;
    [key: string]: unknown;
  };
  capabilities: {
    canCreateCards: boolean;
    canDeleteCards: boolean;
    canSendMessages: boolean;
    canModifyUsers: boolean;
    allowedCardTypes: string[];
    [key: string]: unknown;
  };
}

// Card System Types
export interface BaseCard {
  id: string;
  type: string;
  name: string;
  created: number;
  lastUpdated: number;
  createdBy: CardAuthor;
  content: unknown;
  metadata: {
    version: string;
    schema?: string;
    permissions: {
      canView: ('human' | 'ai' | string)[];
      canEdit: ('human' | 'ai' | string)[];
      canDelete: ('human' | 'ai' | string)[];
    };
    [key: string]: unknown;
  };
}

export interface CardMessage {
  id: string;
  cardId: string;
  content: string;
  timestamp: number;
  author: CardAuthor;
  type: 'text' | 'command' | 'event' | 'system';
  metadata?: {
    command?: string;
    args?: unknown[];
    [key: string]: unknown;
  };
}

export interface CardAuthor {
  id: string;
  username: string;
  type: 'human' | 'ai';
  color: string;
  sprite: string;
}

// Event System Types
export interface BaseEvent {
  id: string;
  timestamp: number;
  source: string;
  actor: {
    id: string;
    type: 'human' | 'ai';
  };
}

export interface CardEvent extends BaseEvent {
  type: 'card:created' | 'card:updated' | 'card:deleted' | 'card:message';
  payload: {
    cardId: string;
    cardType: string;
    data: unknown;
  };
}

export interface UserEvent extends BaseEvent {
  type: 'user:connected' | 'user:disconnected' | 'user:updated';
  payload: {
    userId: string;
    data: Partial<User>;
  };
}

export interface SystemEvent extends BaseEvent {
  type: 'system:error' | 'system:warning' | 'system:info';
  payload: {
    code: string;
    message: string;
    data?: unknown;
  };
}

export type AnyEvent = CardEvent | UserEvent | SystemEvent;

// API Types
export interface ApiResponse<T> {
  status: number;
  data: T;
  error?: string;
  metadata?: {
    timestamp: number;
    version: string;
    [key: string]: unknown;
  };
}

// KV Types
export type KvKey = ['cards' | 'users' | 'sessions' | 'events', string, ...string[]];

export interface KvCardMeta {
  id: string;
  type: string;
  name: string;
  created: number;
  lastUpdated: number;
  createdBy: CardAuthor;
}

export interface KvCardData {
  messages: CardMessage[];
  timestamp: number;
  lastUpdated: number;
  meta: {
    name: string;
    type: string;
    createdBy: CardAuthor;
  };
}

// Card Operations Interface
export interface CardOperations {
  createCard(name: string): Promise<BaseCard>;
  deleteCard(cardId: string): Promise<void>;
  getCard(cardId: string): Promise<BaseCard>;
  getCards(): Promise<BaseCard[]>;
}

// Card Development Types
export interface CardDefinition {
  type: string;
  name: string;
  version: string;
  description: string;
  author: {
    id: string;
    name: string;
    type: 'human' | 'ai';
  };
  schema?: {
    content: unknown;
    metadata: unknown;
  };
  capabilities: {
    canHandleMessages: boolean;
    canHandleCommands: boolean;
    supportedCommands?: string[];
    [key: string]: unknown;
  };
}

export interface CardCommand {
  command: string;
  args?: unknown[];
  source: {
    id: string;
    type: 'human' | 'ai';
  };
  target: {
    cardId: string;
    cardType: string;
  };
  metadata?: {
    timestamp: number;
    [key: string]: unknown;
  };
}

export interface CardResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    command?: string;
    timestamp: number;
    [key: string]: unknown;
  };
}

// Card Development API
export interface CardAPI {
  // Core operations
  create(definition: CardDefinition): Promise<BaseCard>;
  delete(cardId: string): Promise<boolean>;
  update(cardId: string, content: unknown): Promise<BaseCard>;
  
  // Message handling
  sendMessage(cardId: string, message: Partial<CardMessage>): Promise<CardMessage>;
  getMessages(cardId: string, options?: { limit?: number; before?: number }): Promise<CardMessage[]>;
  
  // Command handling
  executeCommand(command: CardCommand): Promise<CardResponse>;
  
  // Event handling
  subscribe(cardId: string, handler: (event: CardEvent) => void): () => void;
  unsubscribe(cardId: string): void;
  
  // Metadata
  getDefinition(cardType: string): Promise<CardDefinition>;
  getCapabilities(cardId: string): Promise<CardDefinition['capabilities']>;
  
  // Utility
  validateSchema(cardType: string, content: unknown): Promise<boolean>;
}

// Plugin System Types
export interface CardPlugin {
  name: string;
  version: string;
  type: string;
  
  // Lifecycle hooks
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  
  // Event handlers
  onMessage?: (message: CardMessage) => Promise<void>;
  onCommand?: (command: CardCommand) => Promise<CardResponse>;
  onEvent?: (event: CardEvent) => Promise<void>;
  
  // Custom methods
  [key: string]: unknown;
}

export interface PluginAPI extends CardAPI {
  // Plugin-specific operations
  register(plugin: CardPlugin): Promise<void>;
  unregister(pluginName: string): Promise<void>;
  
  // State management
  getState(): Promise<unknown>;
  setState(state: unknown): Promise<void>;
  
  // Resource management
  getResource(path: string): Promise<unknown>;
  setResource(path: string, data: unknown): Promise<void>;
}

// WebSocket Types
export interface WSMessage {
  type: 'command' | 'event' | 'response';
  payload: CardCommand | AnyEvent | CardResponse;
  metadata?: {
    timestamp: number;
    source?: {
      id: string;
      type: 'human' | 'ai';
    };
    [key: string]: unknown;
  };
} 
} 