import { MessageEntity } from '../../core/domain/entities/message.entity';
import {
  CompletionOptions,
  CompletionResult,
  ILLMProvider,
} from '../../core/domain/interfaces/llm-provider.interface';
import { proxyFetch } from '../services/proxy-http-client';

export class GeminiLLMAdapter implements ILLMProvider {
  public readonly providerName = 'gemini';

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string = 'gemini-2.0-flash',
    private readonly baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/openai',
    private readonly proxyUrl?: string,
    private readonly defaultMaxTokens: number = 2048
  ) {}

  public async complete(
    messages: MessageEntity[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the Gateway environment.');
    }

    const model = options?.model || this.defaultModel;
    const formattedMessages: Array<{ role: string; content: string }> = [];

    if (options?.systemInstruction) {
      formattedMessages.push({
        role: 'system',
        content: options.systemInstruction,
      });
    }

    for (const msg of messages) {
      formattedMessages.push({
        role: msg.role === 'tool' ? 'user' : msg.role,
        content: msg.content,
      });
    }

    const payload = {
      model,
      messages: formattedMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
    };

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await proxyFetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        proxyUrl: this.proxyUrl,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      const choice = data.choices?.[0];
      const replyContent = choice?.message?.content || '';

      return {
        content: replyContent,
        tokensUsed: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        latencyMs,
        model,
        provider: this.providerName,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Gemini API request timed out after 30 seconds.');
      }
      throw err;
    }
  }

  public async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const startTime = Date.now();
    try {
      const response = await proxyFetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        proxyUrl: this.proxyUrl,
      });
      return {
        ok: response.ok,
        latencyMs: Date.now() - startTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        latencyMs: Date.now() - startTime,
        error: err.message,
      };
    }
  }
}
