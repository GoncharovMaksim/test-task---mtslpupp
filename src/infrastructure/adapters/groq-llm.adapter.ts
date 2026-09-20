import { MessageEntity } from '../../core/domain/entities/message.entity';
import {
  CompletionOptions,
  CompletionResult,
  ILLMProvider,
} from '../../core/domain/interfaces/llm-provider.interface';
import { proxyFetch } from '../services/proxy-http-client';

export function getStandardMaxTokensForModel(model?: string, configuredDefault?: number): number {
  const m = (model || '').toLowerCase();
  // Qwen on Groq on-demand tier has a hard limit of 1000 OTPM (output tokens per minute).
  // We strictly cap Qwen at 500 tokens so requests do not trigger 429 OTPM exhaustion.
  if (m.includes('qwen')) {
    return Math.min(configuredDefault && configuredDefault > 0 ? configuredDefault : 500, 500);
  }
  if (configuredDefault && configuredDefault > 0) {
    return configuredDefault;
  }
  if (m.includes('llama-3.1')) {
    return 2048;
  }
  if (m.includes('llama-3.3') || m.includes('deepseek') || m.includes('gpt-oss')) {
    return 1500;
  }
  return 1500;
}

export class GroqLLMAdapter implements ILLMProvider {
  public readonly providerName = 'groq';

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string = 'qwen/qwen3.8-27b',
    private readonly baseUrl: string = 'https://api.groq.com/openai/v1',
    private readonly proxyUrl?: string,
    private readonly defaultMaxTokens?: number
  ) {}


  public async complete(
    messages: MessageEntity[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY is not configured in the Gateway environment.');
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

    const resolvedMaxTokens =
      options?.maxTokens ?? getStandardMaxTokensForModel(model, this.defaultMaxTokens);

    const payload = {
      model,
      messages: formattedMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: resolvedMaxTokens,
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
        if (response.status === 429 && errorText.includes('output tokens per minute')) {
          try {
            const fallbackModel = model.toLowerCase().includes('qwen')
              ? 'llama-3.3-70b-versatile'
              : model;
            const fallbackTokens = Math.min(resolvedMaxTokens, 350);
            const retryPayload = {
              ...payload,
              model: fallbackModel,
              max_tokens: fallbackTokens,
            };
            const retryResp = await proxyFetch(`${this.baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
              },
              body: JSON.stringify(retryPayload),
              signal: controller.signal,
              proxyUrl: this.proxyUrl,
            });
            if (retryResp.ok) {
              const retryData = await retryResp.json();
              const choice = retryData.choices?.[0];
              return {
                content: choice?.message?.content || '',
                tokensUsed: retryData.usage
                  ? {
                      promptTokens: retryData.usage.prompt_tokens,
                      completionTokens: retryData.usage.completion_tokens,
                      totalTokens: retryData.usage.total_tokens,
                    }
                  : undefined,
                latencyMs: Date.now() - startTime,
                model: fallbackModel,
                provider: this.providerName,
              };
            }
          } catch {
            // fallback attempt failed, proceed to throw original error
          }
        }
        throw new Error(`Groq API returned ${response.status}: ${errorText}`);
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
        throw new Error('Groq API request timed out after 30 seconds.');
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

