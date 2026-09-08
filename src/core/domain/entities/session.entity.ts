import { MessageEntity } from './message.entity';

export interface ChatSession {
  sessionId: string;
  messages: MessageEntity[];
  createdAt: number;
  updatedAt: number;
  userId?: string | number;
}

export class SessionEntity {
  public readonly sessionId: string;
  private _messages: MessageEntity[];
  public readonly createdAt: number;
  private _updatedAt: number;
  public readonly userId?: string | number;

  constructor(sessionId: string, userId?: string | number) {
    this.sessionId = sessionId;
    this.userId = userId;
    this._messages = [];
    this.createdAt = Date.now();
    this._updatedAt = this.createdAt;
  }

  public get messages(): readonly MessageEntity[] {
    return this._messages;
  }

  public get updatedAt(): number {
    return this._updatedAt;
  }

  public addMessage(message: MessageEntity): void {
    this._messages.push(message);
    this._updatedAt = Date.now();
  }

  public getRecentMessages(limit = 20): MessageEntity[] {
    if (this._messages.length <= limit) {
      return [...this._messages];
    }
    return this._messages.slice(this._messages.length - limit);
  }

  public clear(): void {
    this._messages = [];
    this._updatedAt = Date.now();
  }

  public getTotalEstimatedTokens(): number {
    return this._messages.reduce((sum, msg) => sum + msg.estimateTokens(), 0);
  }

  public compactHistory(maxTokens = 4000): MessageEntity[] {
    let accumulatedTokens = 0;
    const reversedSelected: MessageEntity[] = [];

    for (let i = this._messages.length - 1; i >= 0; i--) {
      const msg = this._messages[i];
      const tokens = msg.estimateTokens();
      if (accumulatedTokens + tokens > maxTokens && reversedSelected.length > 0) {
        break;
      }
      reversedSelected.push(msg);
      accumulatedTokens += tokens;
    }

    return reversedSelected.reverse();
  }
}
