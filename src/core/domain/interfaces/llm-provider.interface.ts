import { MessageEntity } from '../entities/message.entity';

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  systemInstruction?: string;
}

export interface CompletionResult {
  content: string;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  model: string;
  provider: string;
}

export interface ILLMProvider {
  readonly providerName: string;
  complete(messages: MessageEntity[], options?: CompletionOptions): Promise<CompletionResult>;
  testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}
