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
    it('should return explicit configured default when provided', () => {
      expect(getStandardMaxTokensForModel('qwen/qwen3.8-27b', 2048)).toBe(2048);
      expect(getStandardMaxTokensForModel('llama-3.3-70b-versatile', 1024)).toBe(1024);
    });

    it('should return 4096 by default for qwen or unspecified models', () => {
      expect(getStandardMaxTokensForModel('qwen/qwen3.8-27b')).toBe(4096);
      expect(getStandardMaxTokensForModel(undefined)).toBe(4096);
      expect(getStandardMaxTokensForModel('some-unknown-model')).toBe(4096);
    });

    it('should return 8192 for llama-3.3, llama-3.1, deepseek, and gemma2 models', () => {
      expect(getStandardMaxTokensForModel('llama-3.3-70b-versatile')).toBe(8192);
      expect(getStandardMaxTokensForModel('llama-3.1-8b-instant')).toBe(8192);
      expect(getStandardMaxTokensForModel('deepseek-r1-distill-llama-70b')).toBe(8192);
      expect(getStandardMaxTokensForModel('gemma2-9b-it')).toBe(8192);
    });
  });

  describe('GroqLLMAdapter.complete', () => {
    it('should use model-resolved standard max_tokens (4096) when options.maxTokens is omitted', async () => {
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
          body: expect.stringMatching(/"max_tokens":4096/),
        })
      );
    });

    it('should use 8192 max_tokens for llama-3.3-70b-versatile when omitted', async () => {
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
          body: expect.stringMatching(/"max_tokens":8192/),
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

      const adapter = new GroqLLMAdapter('test-key', 'qwen/qwen3.8-27b');
      const messages = [new MessageEntity({ role: 'user', content: 'Hi' })];

      await adapter.complete(messages, { maxTokens: 6000 });

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          body: expect.stringMatching(/"max_tokens":6000/),
        })
      );
    });
  });
});
