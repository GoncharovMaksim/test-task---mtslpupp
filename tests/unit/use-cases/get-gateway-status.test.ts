import { GetGatewayStatusUseCase } from '../../../src/core/application/use-cases/get-gateway-status.use-case';
import { ISessionRepository } from '../../../src/core/domain/interfaces/session-repository.interface';
import { ISoulRepository } from '../../../src/core/domain/interfaces/soul-repository.interface';
import { SoulEntity } from '../../../src/core/domain/entities/soul.entity';

describe('GetGatewayStatusUseCase', () => {
  let mockSessionRepo: jest.Mocked<ISessionRepository>;
  let mockSoulRepo: jest.Mocked<ISoulRepository>;

  beforeEach(() => {
    mockSessionRepo = {
      getSession: jest.fn(),
      saveSession: jest.fn(),
      clearSession: jest.fn(),
      getActiveSessionCount: jest.fn().mockResolvedValue(3),
    };

    mockSoulRepo = {
      getSoul: jest.fn().mockResolvedValue(
        new SoulEntity({
          rawMarkdown: '# OpenClaw',
          systemPrompt: 'System instruction',
          metadata: {
            name: 'OpenClaw Persona',
            description: 'Autonomous Assistant',
          },
        })
      ),
      updateSoul: jest.fn(),
      resetToDefault: jest.fn(),
    };
  });

  it('should return gateway status with explicit bot username', async () => {
    const useCase = new GetGatewayStatusUseCase(
      mockSessionRepo,
      mockSoulRepo,
      '@TestCustomBot'
    );

    const status = await useCase.execute();

    expect(status.name).toBe('OpenClaw Gateway');
    expect(status.version).toBe('1.0.0');
    expect(status.activeSessions).toBe(3);
    expect(status.soulName).toBe('OpenClaw Persona');
    expect(status.botUsername).toBe('@TestCustomBot');
    expect(status.features.telegramBot).toBe(true);
  });

  it('should fallback to default bot username if omitted', async () => {
    delete process.env.TELEGRAM_BOT_USERNAME;
    delete process.env.NEXT_PUBLIC_BOT_USERNAME;

    const useCase = new GetGatewayStatusUseCase(
      mockSessionRepo,
      mockSoulRepo
    );

    const status = await useCase.execute();
    expect(status.botUsername).toBe('@dp_openclawmtslpu_wltsg_bot');
  });
});
