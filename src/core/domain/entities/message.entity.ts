export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  metadata?: {
    telegramChatId?: number;
    telegramUserId?: number;
    telegramUsername?: string;
    tokensUsed?: number;
    provider?: string;
  };
}

export class MessageEntity implements ChatMessage {
  public readonly id: string;
  public readonly role: MessageRole;
  public readonly content: string;
  public readonly timestamp: number;
  public readonly metadata?: ChatMessage['metadata'];

  constructor(params: {
    id?: string;
    role: MessageRole;
    content: string;
    timestamp?: number;
    metadata?: ChatMessage['metadata'];
  }) {
    this.id = params.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.role = params.role;
    this.content = params.content;
    this.timestamp = params.timestamp || Date.now();
    this.metadata = params.metadata;
  }

  public estimateTokens(): number {
    return Math.max(1, Math.ceil(this.content.length / 4));
  }

  public toJSON(): ChatMessage {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
      timestamp: this.timestamp,
      metadata: this.metadata,
    };
  }
}
