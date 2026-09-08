export type LLMProviderType = 'groq' | 'openai' | 'openrouter' | 'ollama';

export interface ProviderConfig {
  type: LLMProviderType;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface NetworkConnectivityStatus {
  endpoint: string;
  target: 'telegram' | 'llm' | 'proxy';
  status: 'ok' | 'error' | 'bypassed';
  latencyMs: number;
  message?: string;
}
