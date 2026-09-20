import {
  getStandardMaxTokensForModel,
  stitchChunks,
  GroqLLMAdapter,
} from '../../../src/infrastructure/adapters/groq-llm.adapter';
import { MessageEntity } from '../../../src/core/domain/entities/message.entity';

jest.mock('../../../src/infrastructure/services/proxy-http-client', () => ({
  proxyFetch: jest.fn(),
}));

import { proxyFetch } from '../../../src/infrastructure/services/proxy-http-client';

describe('GroqLLMAdapter & Token Resolution', () => {
  const mockProxyFetch = proxyFetch as jest.MockedFunction<typeof proxyFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('stitchChunks', () => {
    it('should stitch partial word completion cleanly', () => {
      const result = stitchChunks('добавляет сет', 'евые задержки');
      expect(result).toBe('добавляет сетевые задержки');
    });

    it('should handle repeated overlapping word cleanly', () => {
      const result = stitchChunks('добавляет сет', 'сетевые задержки');
      expect(result).toBe('добавляет сетевые задержки');
    });

    it('should strip common continuation preambles', () => {
      const result = stitchChunks('добавляет сет', 'Конечно, продолжаю: евые задержки');
      expect(result).toBe('добавляет сетевые задержки');
    });

    it('should preserve newlines across paragraph breaks', () => {
      const result = stitchChunks('Пункт 1.\n\n', 'Пункт 2.');
      expect(result).toBe('Пункт 1.\n\nПункт 2.');
    });
  });

  describe('getStandardMaxTokensForModel', () => {
    it('should return explicit configured default when provided', () => {
      expect(getStandardMaxTokensForModel('qwen/qwen3.8-27b', 1024)).toBe(1024);
      expect(getStandardMaxTokensForModel('openai/gpt-oss-120b', 3000)).toBe(3000);
    });

    it('should return safe 2048 by default for 8K TPM models (qwen, gpt-oss, llama)', () => {
      expect(getStandardMaxTokensForModel('qwen/qwen3.8-27b')).toBe(700);
      expect(getStandardMaxTokensForModel('openai/gpt-oss-120b')).toBe(2048);
      expect(getStandardMaxTokensForModel('openai/gpt-oss-20b')).toBe(2048);
      expect(getStandardMaxTokensForModel('llama-3.3-70b-versatile')).toBe(2048);
    });

    it('should return 4096 for high-throughput compound models (70K TPM)', () => {
      expect(getStandardMaxTokensForModel('groq/compound')).toBe(4096);
      expect(getStandardMaxTokensForModel('groq/compound-mini')).toBe(4096);
    });
  });

  describe('GroqLLMAdapter.complete', () => {
    it('should use 700 max_tokens for qwen when options.maxTokens is omitted', async () => {
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello standard' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      } as any);

      const adapter = new GroqLLMAdapter('test-key', 'qwen/qwen3.8-27b');
      const messages = [new MessageEntity({ role: 'user', content: 'Hi' })];

      const res = await adapter.complete(messages);

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          body: expect.stringMatching(/"max_tokens":700/),
        })
      );
      expect(res.content).toBe('Hello standard');
    });

    it('should automatically continue and stitch response when finish_reason is length', async () => {
      // 1st pass truncated by length
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: '1. Достоинство\n2. Недостаток добавляет сет' },
              finish_reason: 'length',
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 500, total_tokens: 600 },
        }),
      } as any);

      // 2nd pass continuation finishes cleanly
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'евые задержки и накладные расходы.' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 650, completion_tokens: 80, total_tokens: 730 },
        }),
      } as any);

      const adapter = new GroqLLMAdapter('test-key', 'qwen/qwen3.8-27b');
      const messages = [new MessageEntity({ role: 'user', content: 'Напиши анализ' })];

      const result = await adapter.complete(messages);

      expect(mockProxyFetch).toHaveBeenCalledTimes(2);
      expect(result.content).toBe('1. Достоинство\n2. Недостаток добавляет сетевые задержки и накладные расходы.');
      expect(result.tokensUsed?.completionTokens).toBe(580);
    });

    it('should not continue if options.autoContinue is false', async () => {
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Truncated output' }, finish_reason: 'length' }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      } as any);

      const adapter = new GroqLLMAdapter('test-key', 'qwen/qwen3.8-27b');
      const messages = [new MessageEntity({ role: 'user', content: 'Hi' })];

      const result = await adapter.complete(messages, { autoContinue: false });

      expect(mockProxyFetch).toHaveBeenCalledTimes(1);
      expect(result.content).toBe('Truncated output');
    });

    it('should respect explicit options.maxTokens when passed', async () => {
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello custom' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      } as any);

      const adapter = new GroqLLMAdapter('test-key', 'openai/gpt-oss-120b');
      const messages = [new MessageEntity({ role: 'user', content: 'Hi' })];

      await adapter.complete(messages, { maxTokens: 3500 });

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          body: expect.stringMatching(/"max_tokens":3500/),
        })
      );
    });

    it('should automatically recover when Groq returns 429 OTPM limit exceeded', async () => {
      // First attempt fails with 429 OTPM
      mockProxyFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Request too large on output tokens per minute (OTPM): Limit 8000, Requested 9000.',
      } as any);

      // Second fallback attempt succeeds
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Recovered response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
        }),
      } as any);

      const adapter = new GroqLLMAdapter('test-key', 'qwen/qwen3.8-27b');
      const messages = [new MessageEntity({ role: 'user', content: 'Hi' })];

      const result = await adapter.complete(messages);

      expect(result.content).toBe('Recovered response');
      expect(mockProxyFetch).toHaveBeenCalledTimes(2);
    });
  });
});
