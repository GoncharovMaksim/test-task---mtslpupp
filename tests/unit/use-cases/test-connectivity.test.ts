import { TestConnectivityUseCase } from '../../../src/core/application/use-cases/test-connectivity.use-case';
import { ILLMProvider } from '../../../src/core/domain/interfaces/llm-provider.interface';
import { IProxyService } from '../../../src/core/domain/interfaces/proxy-service.interface';

describe('TestConnectivityUseCase', () => {
  let mockProxyService: jest.Mocked<IProxyService>;
  let mockLLMProvider: jest.Mocked<ILLMProvider>;

  beforeEach(() => {
    mockProxyService = {
      checkTelegramConnectivity: jest.fn().mockResolvedValue({
        endpoint: 'https://api.telegram.org',
        target: 'telegram',
        status: 'ok',
        latencyMs: 120,
      }),
      checkLLMConnectivity: jest.fn().mockResolvedValue({
        endpoint: 'https://api.groq.com/openai/v1/models',
        target: 'llm',
        status: 'ok',
        latencyMs: 80,
      }),
      getAgentForUrl: jest.fn(),
    };

    mockLLMProvider = {
      providerName: 'groq',
      complete: jest.fn(),
      testConnection: jest.fn().mockResolvedValue({ ok: true, latencyMs: 50 }),
    };
  });

  it('should return healthy overall report when all endpoints respond', async () => {
    const useCase = new TestConnectivityUseCase(mockProxyService, mockLLMProvider, {
      telegramProxyUrl: 'socks5://localhost:1080',
      llmEndpoint: 'https://api.groq.com/openai/v1/models',
    });

    const report = await useCase.execute();
    expect(report.overallHealthy).toBe(true);
    expect(report.telegramStatus.status).toBe('ok');
    expect(report.llmStatus.status).toBe('ok');
    expect(report.recommendation).toContain('optimal');
  });

  it('should flag degraded status when telegram fails', async () => {
    mockProxyService.checkTelegramConnectivity.mockResolvedValueOnce({
      endpoint: 'https://api.telegram.org',
      target: 'telegram',
      status: 'error',
      latencyMs: 6000,
      message: 'Timeout',
    });

    const useCase = new TestConnectivityUseCase(mockProxyService, mockLLMProvider, {});
    const report = await useCase.execute();

    expect(report.overallHealthy).toBe(false);
    expect(report.telegramStatus.status).toBe('error');
    expect(report.recommendation).toContain('Telegram API blocked');
  });
});
