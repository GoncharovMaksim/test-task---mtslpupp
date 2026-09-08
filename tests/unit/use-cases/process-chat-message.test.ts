import { ProcessChatMessageUseCase } from '../../../src/core/application/use-cases/process-chat-message.use-case';
import { SoulEntity } from '../../../src/core/domain/entities/soul.entity';
import { ILLMProvider } from '../../../src/core/domain/interfaces/llm-provider.interface';
import { InMemorySessionRepository } from '../../../src/infrastructure/adapters/in-memory-session.repository';

describe('ProcessChatMessageUseCase', () => {
  let sessionRepo: InMemorySessionRepository;
  let mockSoulRepo: any;
  let mockLLMProvider: jest.Mocked<ILLMProvider>;
  let useCase: ProcessChatMessageUseCase;

  beforeEach(() => {
    sessionRepo = new InMemorySessionRepository();
    mockSoulRepo = {
      getSoul: jest.fn().mockResolvedValue(
        new SoulEntity({
          rawMarkdown: '# Test Soul',
          systemPrompt: 'System instructions',
        })
      ),
      saveSoul: jest.fn(),
    };
    mockLLMProvider = {
      providerName: 'mock_groq',
      complete: jest.fn().mockResolvedValue({
        content: 'Mocked completion response',
        tokensUsed: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        latencyMs: 42,
        model: 'mock-model',
        provider: 'mock_groq',
      }),
      testConnection: jest.fn().mockResolvedValue({ ok: true, latencyMs: 10 }),
    };

    useCase = new ProcessChatMessageUseCase(sessionRepo, mockSoulRepo, mockLLMProvider);
  });

  it('should reject empty message content', async () => {
    await expect(
      useCase.execute({
        sessionId: 'test-sess',
        content: '   ',
      })
    ).rejects.toThrow('Message content cannot be empty.');
  });

  it('should process message, persist session, and return assistant response', async () => {
    const response = await useCase.execute({
      sessionId: 'session_abc',
      content: 'What is OpenClaw?',
      channel: 'telegram',
    });

    expect(response.sessionId).toBe('session_abc');
    expect(response.responseMessage.content).toBe('Mocked completion response');
    expect(response.latencyMs).toBe(42);
    expect(response.provider).toBe('mock_groq');

    const session = await sessionRepo.getOrCreate('session_abc');
    expect(session.messages.length).toBe(2);
    expect(session.messages[0].role).toBe('user');
    expect(session.messages[0].content).toBe('What is OpenClaw?');
    expect(session.messages[1].role).toBe('assistant');
  });
});
