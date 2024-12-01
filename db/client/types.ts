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
export type CardRelationship = 'thread' | 'attachment' | 'reference';

export interface NestedCard {
  id: string;
  type: string;
  relationship: CardRelationship;
  addedAt: number;
  addedBy: CardAuthor;
  position?: number; // For ordering nested cards
}

export interface BaseCard {
  id: string;
  type: string;
  name: string;
  created: number;
  lastUpdated: number;
  createdBy: CardAuthor;
  parentCard?: {
    id: string;
    type: string;
    relationship: CardRelationship;
  };
  content: unknown;
  metadata: {
    version: string;
    schema?: string;
    permissions: {
      canView: ('human' | 'ai' | string)[];
      canEdit: ('human' | 'ai' | string)[];
      canDelete: ('human' | 'ai' | string)[];
    };
    nestedCards?: NestedCard[];
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
    edited?: boolean;
    editedAt?: number;
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
  
  // Nested card operations
  attachCard(parentId: string, childId: string, relationship: CardRelationship): Promise<void>;
  detachCard(parentId: string, childId: string): Promise<void>;
  moveCard(cardId: string, fromParentId: string, toParentId: string): Promise<void>;
  reorderCard(parentId: string, cardId: string, newPosition: number): Promise<void>;
  getNestedCards(cardId: string, relationship?: CardRelationship): Promise<BaseCard[]>;
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
  update(cardId: string, data: Record<string, unknown>): Promise<boolean>;
  get(cardId: string): Promise<BaseCard>;
  list(): Promise<BaseCard[]>;

  // Message operations
  message(cardId: string, text: string): Promise<CardMessage>;
  messages(cardId: string): Promise<CardMessage[]>;
  deleteMessage(cardId: string, messageId: string): Promise<boolean>;

  // Plugin operations
  plugin<T>(action: string, ...args: unknown[]): Promise<T>;
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
  
  // Plugin API
  getCapabilities?: () => Promise<Record<string, unknown>>;
  validateConfig?: (config: unknown) => Promise<boolean>;
}

// Plugin Configuration
export interface PluginConfig {
  enabled: boolean;
  settings: Record<string, unknown>;
}

// Plugin Registry
export interface PluginRegistry {
  register(plugin: CardPlugin): Promise<void>;
  unregister(pluginName: string): Promise<void>;
  getPlugin(pluginName: string): CardPlugin | undefined;
  getPlugins(): CardPlugin[];
}

// Plugin API
export interface PluginAPI extends CardAPI {
  // Plugin lifecycle
  load(): Promise<void>;
  unload(): Promise<void>;
  
  // Plugin configuration
  getConfig(): Promise<PluginConfig>;
  updateConfig(config: Partial<PluginConfig>): Promise<void>;
  
  // Plugin state
  getState(): Promise<Record<string, unknown>>;
  setState(state: Record<string, unknown>): Promise<void>;
  
  // Plugin events
  emit(event: CardEvent): Promise<void>;
  on(eventType: string, handler: (event: CardEvent) => Promise<void>): void;
  off(eventType: string): void;
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

// Session Management
export interface Session {
  sessionId: string;
  userId: string;
  created: number;
  expires: number;
  cookie: string;
  data?: Record<string, unknown>;
}

export interface Message {
  id: string;
  content: string;
  author: CardAuthor;
  timestamp: number;
  type: MessageType;
  metadata?: MessageMetadata;
  parentId?: string;  // For threaded messages
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  mentions?: string[]; // User IDs that are mentioned
  edited?: boolean;
  editHistory?: MessageEdit[];
}

export type MessageType = 'text' | 'system' | 'action' | 'error' | 'ai' | 'human';

export interface MessageMetadata {
  version: string;
  schema?: string;
  context?: Record<string, unknown>;
  tags?: string[];
  visibility?: 'public' | 'private' | 'group';
  expiresAt?: number;
  importance?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'sent' | 'delivered' | 'read' | 'error';
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // User IDs who reacted
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'link';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageEdit {
  timestamp: number;
  content: string;
  editor: CardAuthor;
}

export interface MessageThread {
  id: string;
  parentId: string;
  messages: Message[];
  metadata: MessageMetadata;
  participants: CardAuthor[];
  lastActivity: number;
}

export interface MessageState {
  messages: Message[];
  threads: MessageThread[];
  metadata: {
    version: string;
    schema?: string;
    messageCount: number;
    threadCount: number;
    lastMessageTime: number;
    permissions: {
      canSend: string[];
      canEdit: string[];
      canDelete: string[];
      canReact: string[];
    };
  };
}

// Message operations interface
export interface MessageOperations {
  addMessage(cardId: string, text: string): Promise<Response>;
  deleteMessage(cardId: string, messageId: string): Promise<Response>;
  getMessages(cardId: string): Promise<Response>;
  editMessage(cardId: string, messageId: string, text: string): Promise<Response>;
}

export interface MessageCard extends BaseCard {
  content: {
    messages: CardMessage[];
    lastMessageAt?: number;
  };
} 