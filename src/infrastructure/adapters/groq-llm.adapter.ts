import { MessageEntity } from '../../core/domain/entities/message.entity';
import {
  CompletionOptions,
  CompletionResult,
  ILLMProvider,
} from '../../core/domain/interfaces/llm-provider.interface';
import { proxyFetch } from '../services/proxy-http-client';

export function getStandardMaxTokensForModel(model?: string, configuredDefault?: number): number {
  if (configuredDefault && configuredDefault > 0) {
    return configuredDefault;
  }
  const m = (model || '').toLowerCase();
  // Qwen on Groq on-demand tier has a strict output token limit of 1000 OTPM (output tokens per minute).
  // We allocate 700 tokens for the first pass, allowing multi-step auto-continuation (pass 2 with ~280 tokens)
  // to stay strictly within the 1000 OTPM ceiling without triggering rate limits.
  if (m.includes('qwen')) {
    return 700;
  }
  if (m.includes('compound')) {
    return 4096;
  }
  if (m.includes('gpt-oss') || m.includes('llama')) {
    return 2048;
  }
  return 2048;
}

/**
 * Stitches two consecutive response chunks together cleanly, avoiding duplicate words,
 * removing assistant preambles (e.g. "Конечно, продолжаю..."), and ensuring partial words
 * cut off by max_tokens boundary are reconstructed accurately.
 */
export function stitchChunks(prev: string, next: string): string {
  if (!prev) return next;
  if (!next) return prev;

  // Clean out common continuation preambles
  let cleanedNext = next.replace(
    /^(?:Конечно,?\s*(?:я\s*)?продолж[а-я]+[:\s]*|Продолжение[:\s]*|Продолжаю[:\s]*|Вот продолжение[:\s]*|Sure,?\s*continuing[:\s]*|Continuing[:\s]*)/i,
    ''
  );

  // If next starts with whitespace and prev ends with whitespace, collapse to single whitespace
  if (/\s$/.test(prev) && /^\s/.test(cleanedNext)) {
    cleanedNext = cleanedNext.replace(/^\s+/, '');
  }

  // Check if last word of prev overlaps with start of cleanedNext
  const prevWordMatch = prev.match(/([a-zA-Zа-яА-Я0-9_-]+)$/);
  if (prevWordMatch) {
    const lastWord = prevWordMatch[1];
    const nextWordMatch = cleanedNext.match(/^([a-zA-Zа-яА-Я0-9_-]+)/);
    if (nextWordMatch) {
      const nextWord = nextWordMatch[1];
      // If nextWord starts with lastWord (e.g. "сетевые" starts with "сет")
      if (
        nextWord.toLowerCase().startsWith(lastWord.toLowerCase()) &&
        nextWord.length >= lastWord.length
      ) {
        return prev.slice(0, -lastWord.length) + cleanedNext;
      }
    }
  }

  return prev + cleanedNext;
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
            const fallbackTokens = model.toLowerCase().includes('qwen') ? 500 : Math.min(resolvedMaxTokens, 1024);
            const retryPayload = {
              ...payload,
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
                model,
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
      const choice = data.choices?.[0];
      let accumulatedContent = choice?.message?.content || '';
      let finishReason = choice?.finish_reason;

      let promptTokens = data.usage?.prompt_tokens || 0;
      let completionTokens = data.usage?.completion_tokens || 0;
      let totalTokens = data.usage?.total_tokens || 0;

      // Auto-continuation loop: if generation was truncated due to token limit ('length')
      // and auto-continuation is not explicitly disabled, automatically request continuation passes.
      const maxContinuations = options?.autoContinue === false ? 0 : (options?.maxContinuations ?? 2);
      let continuationCount = 0;

      while (finishReason === 'length' && continuationCount < maxContinuations) {
        continuationCount++;
        const snippet = accumulatedContent.slice(-80).trim();
        const isRussian = /[а-яА-Я]/.test(accumulatedContent);
        const continuationPrompt = isRussian
          ? `Предыдущий ответ был прерван лимитом длины на фразе: "${snippet}". Продолжай ответ строго с этого места без повторения уже сказанного и без вводных фраз.`
          : `Your previous response was truncated by length at: "${snippet}". Please continue exactly from where you left off without repeating prior text or adding filler.`;

        const contMaxTokens = model.toLowerCase().includes('qwen')
          ? Math.min(resolvedMaxTokens, 280)
          : resolvedMaxTokens;

        const continuationPayload = {
          model,
          messages: [
            ...formattedMessages,
            { role: 'assistant', content: accumulatedContent },
            { role: 'user', content: continuationPrompt },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: contMaxTokens,
        };

        const contController = new AbortController();
        const contTimeoutId = setTimeout(() => contController.abort(), 25000);

        try {
          const contResponse = await proxyFetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(continuationPayload),
            signal: contController.signal,
            proxyUrl: this.proxyUrl,
          });
          clearTimeout(contTimeoutId);

          if (!contResponse.ok) {
            // If continuation fails (e.g. rate limit), break loop and preserve existing response
            break;
          }

          const contData = await contResponse.json();
          const contChoice = contData.choices?.[0];
          const nextChunk = contChoice?.message?.content || '';

          if (!nextChunk) {
            break;
          }

          accumulatedContent = stitchChunks(accumulatedContent, nextChunk);
          finishReason = contChoice?.finish_reason;

          if (contData.usage) {
            promptTokens += contData.usage.prompt_tokens || 0;
            completionTokens += contData.usage.completion_tokens || 0;
            totalTokens += contData.usage.total_tokens || 0;
          }
        } catch {
          clearTimeout(contTimeoutId);
          break;
        }
      }

      const latencyMs = Date.now() - startTime;

      return {
        content: accumulatedContent,
        tokensUsed: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
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

