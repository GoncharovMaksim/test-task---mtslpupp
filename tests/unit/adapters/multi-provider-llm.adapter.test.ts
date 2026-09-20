import { MultiProviderLLMAdapter } from '../../../src/infrastructure/adapters/multi-provider-llm.adapter';
import { ILLMProvider } from '../../../src/core/domain/interfaces/llm-provider.interface';
import { MessageEntity } from '../../../src/core/domain/entities/message.entity';

describe('MultiProviderLLMAdapter', () => {
  let mockGroq: jest.Mocked<ILLMProvider>;
  let mockGemini: jest.Mocked<ILLMProvider>;
  let adapter: MultiProviderLLMAdapter;

  beforeEach(() => {
    mockGroq = {
      providerName: 'groq',
      complete: jest.fn().mockResolvedValue({
        content: 'From Groq',
        latencyMs: 50,
        model: 'qwen/qwen3.8-27b',
        provider: 'groq',
      }),
      testConnection: jest.fn().mockResolvedValue({ ok: true, latencyMs: 50 }),
    };

    mockGemini = {
      providerName: 'gemini',
      complete: jest.fn().mockResolvedValue({
        content: 'From Gemini',
        latencyMs: 120,
        model: 'gemini-2.0-flash',
        provider: 'gemini',
      }),
      testConnection: jest.fn().mockResolvedValue({ ok: true, latencyMs: 120 }),
    };

    adapter = new MultiProviderLLMAdapter(mockGroq, {
      groq: mockGroq,
      gemini: mockGemini,
    });
  });

  it('should route gemini models to Gemini provider', async () => {
    const messages = [new MessageEntity({ role: 'user', content: 'Hi Gemini' })];
    const res = await adapter.complete(messages, { model: 'gemini-2.0-flash' });

    expect(mockGemini.complete).toHaveBeenCalledWith(messages, { model: 'gemini-2.0-flash' });
    expect(mockGroq.complete).not.toHaveBeenCalled();
    expect(res.content).toBe('From Gemini');
  });

  it('should route groq models (llama, qwen, deepseek, openai/) to Groq provider', async () => {
    const messages = [new MessageEntity({ role: 'user', content: 'Hi Groq' })];
    const res = await adapter.complete(messages, { model: 'llama-3.3-70b-versatile' });

    expect(mockGroq.complete).toHaveBeenCalledWith(messages, { model: 'llama-3.3-70b-versatile' });
    expect(mockGemini.complete).not.toHaveBeenCalled();
    expect(res.content).toBe('From Groq');
  });

  it('should fallback to defaultProvider when model is omitted', async () => {
    const messages = [new MessageEntity({ role: 'user', content: 'Hi' })];
    await adapter.complete(messages);

    expect(mockGroq.complete).toHaveBeenCalled();
  });
});
