// KV operation types
export interface KvSetRequest {
  key: string;
  value: unknown;
}

// Card operation types
export interface CreateCardRequest {
  name: string;
}

export interface MessageRequest {
  cardId: string;
  text: string;
}

export interface DeleteCardRequest {
  cardId: string;
}

export interface DeleteMessageRequest {
  cardId: string;
  messageId: string;
}

// Response types
export interface ErrorResponse {
  error: string;
} 