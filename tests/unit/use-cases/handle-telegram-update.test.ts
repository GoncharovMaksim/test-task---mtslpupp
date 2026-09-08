import { HandleTelegramUpdateUseCase } from '../../../src/core/application/use-cases/handle-telegram-update.use-case';
import { ProcessChatMessageUseCase } from '../../../src/core/application/use-cases/process-chat-message.use-case';
import { MessageEntity } from '../../../src/core/domain/entities/message.entity';
import { SoulEntity } from '../../../src/core/domain/entities/soul.entity';
import { IMessengerAdapter } from '../../../src/core/domain/interfaces/messenger-adapter.interface';
import { InMemorySessionRepository } from '../../../src/infrastructure/adapters/in-memory-session.repository';

describe('HandleTelegramUpdateUseCase', () => {
  let mockProcessUseCase: jest.Mocked<ProcessChatMessageUseCase>;
  let mockTelegramAdapter: jest.Mocked<IMessengerAdapter>;
  let sessionRepo: InMemorySessionRepository;
  let mockSoulRepo: any;
  let useCase: HandleTelegramUpdateUseCase;

  beforeEach(() => {
    mockProcessUseCase = {
      execute: jest.fn().mockResolvedValue({
        sessionId: 'tg_100',
        responseMessage: new MessageEntity({
          role: 'assistant',
          content: 'Echo from bot',
        }),
        latencyMs: 30,
        model: 'qwen',
        provider: 'groq',
      }),
    } as any;

    mockTelegramAdapter = {
      channelName: 'telegram',
      sendMessage: jest.fn().mockResolvedValue(true),
    };

    sessionRepo = new InMemorySessionRepository();
    mockSoulRepo = {
      getSoul: jest.fn().mockResolvedValue(
        new SoulEntity({
          rawMarkdown: '# OpenClaw Assistant',
          systemPrompt: 'System instructions',
          sections: [{ title: 'Directives', content: 'Be helpful.' }],
        })
      ),
    };

    useCase = new HandleTelegramUpdateUseCase(
      mockProcessUseCase,
      mockTelegramAdapter,
      sessionRepo,
      mockSoulRepo,
      [100, 200] // Whitelist user 100 and 200
    );
  });

  it('should ignore updates without text message', async () => {
    const result = await useCase.execute({ update_id: 1 });
    expect(result.handled).toBe(false);
    expect(result.action).toBe('ignored_non_text');
  });

  it('should block non-whitelisted users when whitelist is configured', async () => {
    const result = await useCase.execute({
      update_id: 2,
      message: {
        message_id: 10,
        chat: { id: 999, type: 'private' },
        from: { id: 999, is_bot: false, first_name: 'Intruder' },
        date: 1234567,
        text: 'hello',
      },
    });

    expect(result.handled).toBe(true);
    expect(result.action).toBe('access_denied');
    expect(mockTelegramAdapter.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Access restricted'),
      })
    );
  });

  it('should handle /start command for whitelisted user', async () => {
    const result = await useCase.execute({
      update_id: 3,
      message: {
        message_id: 11,
        chat: { id: 100, type: 'private' },
        from: { id: 100, is_bot: false, first_name: 'Maksim' },
        date: 1234567,
        text: '/start',
      },
    });

    expect(result.handled).toBe(true);
    expect(result.action).toBe('command_start');
    expect(mockTelegramAdapter.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('OpenClaw Gateway active'),
      })
    );
  });

  it('should dispatch natural language messages to processChatMessageUseCase', async () => {
    const result = await useCase.execute({
      update_id: 4,
      message: {
        message_id: 12,
        chat: { id: 100, type: 'private' },
        from: { id: 100, is_bot: false, first_name: 'Maksim' },
        date: 1234567,
        text: 'Tell me about clean architecture',
      },
    });

    expect(result.handled).toBe(true);
    expect(result.action).toBe('chat_completed');
    expect(mockProcessUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Tell me about clean architecture',
      })
    );
    expect(mockTelegramAdapter.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Echo from bot',
      })
    );
  });
});
