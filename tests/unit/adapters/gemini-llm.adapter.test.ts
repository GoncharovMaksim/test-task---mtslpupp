import { GeminiLLMAdapter } from '../../../src/infrastructure/adapters/gemini-llm.adapter';
import { MessageEntity } from '../../../src/core/domain/entities/message.entity';

jest.mock('../../../src/infrastructure/services/proxy-http-client', () => ({
  proxyFetch: jest.fn(),
}));

import { proxyFetch } from '../../../src/infrastructure/services/proxy-http-client';

describe('GeminiLLMAdapter', () => {
  const mockProxyFetch = proxyFetch as jest.MockedFunction<typeof proxyFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if apiKey is not provided', async () => {
    const adapter = new GeminiLLMAdapter('');
    const messages = [new MessageEntity({ role: 'user', content: 'Hi' })];

    await expect(adapter.complete(messages)).rejects.toThrow(
      'GEMINI_API_KEY is not configured in the Gateway environment.'
    );
  });

  it('should call Google Gemini OpenAI endpoint with correct payload and headers', async () => {
    mockProxyFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello from Gemini' } }],
        usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
      }),
    } as any);

    const adapter = new GeminiLLMAdapter('gemini-key-xyz', 'gemini-2.0-flash');
    const messages = [new MessageEntity({ role: 'user', content: 'Hello Gemini' })];

    const result = await adapter.complete(messages);

    expect(result.content).toBe('Hello from Gemini');
    expect(result.provider).toBe('gemini');
    expect(result.model).toBe('gemini-2.0-flash');
    expect(result.tokensUsed?.totalTokens).toBe(40);

    expect(mockProxyFetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer gemini-key-xyz',
        }),
      })
    );
  });
});
