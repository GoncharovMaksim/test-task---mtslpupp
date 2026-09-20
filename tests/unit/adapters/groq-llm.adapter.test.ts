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
      expect(getStandardMaxTokensForModel('qwen/qwen3.8-27b', 1024)).toBe(1024);
      expect(getStandardMaxTokensForModel('llama-3.3-70b-versatile', 1024)).toBe(1024);
    });

    it('should return safe 2048 by default for models respecting TPM limits', () => {
      expect(getStandardMaxTokensForModel('qwen/qwen3.8-27b')).toBe(2048);
      expect(getStandardMaxTokensForModel(undefined)).toBe(2048);
      expect(getStandardMaxTokensForModel('some-unknown-model')).toBe(2048);
      expect(getStandardMaxTokensForModel('llama-3.3-70b-versatile')).toBe(2048);
      expect(getStandardMaxTokensForModel('llama-3.1-8b-instant')).toBe(2048);
      expect(getStandardMaxTokensForModel('deepseek-r1-distill-llama-70b')).toBe(2048);
      expect(getStandardMaxTokensForModel('openai/gpt-oss-120b')).toBe(2048);
    });
  });

  describe('GroqLLMAdapter.complete', () => {
    it('should use model-resolved standard max_tokens (2048) when options.maxTokens is omitted', async () => {
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
          body: expect.stringMatching(/"max_tokens":2048/),
        })
      );
    });

    it('should use 2048 max_tokens for llama-3.3-70b-versatile when omitted', async () => {
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
          body: expect.stringMatching(/"max_tokens":2048/),
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
