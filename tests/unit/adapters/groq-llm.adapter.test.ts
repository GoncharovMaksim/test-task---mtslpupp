import { getStandardMaxTokensForModel, GroqLLMAdapter } from '../../../src/infrastructure/adapters/groq-llm.adapter';
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

  describe('getStandardMaxTokensForModel', () => {
    it('should return explicit configured default when provided but cap qwen at 500', () => {
      expect(getStandardMaxTokensForModel('qwen/qwen3.8-27b', 1024)).toBe(500);
      expect(getStandardMaxTokensForModel('llama-3.3-70b-versatile', 1024)).toBe(1024);
    });

    it('should return safe 2048 by default for models respecting TPM limits and 500 for qwen', () => {
      expect(getStandardMaxTokensForModel('qwen/qwen3.8-27b')).toBe(500);
      expect(getStandardMaxTokensForModel(undefined)).toBe(1500);
      expect(getStandardMaxTokensForModel('some-unknown-model')).toBe(1500);
      expect(getStandardMaxTokensForModel('llama-3.3-70b-versatile')).toBe(1500);
      expect(getStandardMaxTokensForModel('llama-3.1-8b-instant')).toBe(2048);
      expect(getStandardMaxTokensForModel('deepseek-r1-distill-llama-70b')).toBe(1500);
      expect(getStandardMaxTokensForModel('openai/gpt-oss-120b')).toBe(1500);
    });
  });

  describe('GroqLLMAdapter.complete', () => {
    it('should use model-resolved standard max_tokens (500) for qwen when options.maxTokens is omitted', async () => {
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello standard' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      } as any);

      const adapter = new GroqLLMAdapter('test-key', 'qwen/qwen3.8-27b');
      const messages = [new MessageEntity({ role: 'user', content: 'Hi' })];

      await adapter.complete(messages);

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          body: expect.stringMatching(/"max_tokens":500/),
        })
      );
    });

    it('should use 1500 max_tokens for llama-3.3-70b-versatile when omitted', async () => {
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello llama' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      } as any);

      const adapter = new GroqLLMAdapter('test-key', 'llama-3.3-70b-versatile');
      const messages = [new MessageEntity({ role: 'user', content: 'Hi' })];

      await adapter.complete(messages);

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          body: expect.stringMatching(/"max_tokens":1500/),
        })
      );
    });

    it('should respect explicit options.maxTokens when passed', async () => {
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello custom' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      } as any);

      const adapter = new GroqLLMAdapter('test-key', 'llama-3.3-70b-versatile');
      const messages = [new MessageEntity({ role: 'user', content: 'Hi' })];

      await adapter.complete(messages, { maxTokens: 6000 });

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          body: expect.stringMatching(/"max_tokens":6000/),
        })
      );
    });

    it('should automatically recover when Groq returns 429 OTPM limit exceeded', async () => {
      // First attempt fails with 429 OTPM
      mockProxyFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Request too large on output tokens per minute (OTPM): Limit 1000, Requested 1127.',
      } as any);

      // Second fallback attempt succeeds
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Recovered response' } }],
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
