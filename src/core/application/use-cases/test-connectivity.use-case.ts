import { NetworkConnectivityStatus } from '../../domain/entities/provider.entity';
import { ILLMProvider } from '../../domain/interfaces/llm-provider.interface';
import { IProxyService } from '../../domain/interfaces/proxy-service.interface';

export interface DiagnosticsReport {
  timestamp: string;
  telegramStatus: NetworkConnectivityStatus;
  llmStatus: NetworkConnectivityStatus;
  overallHealthy: boolean;
  recommendation: string;
}

export class TestConnectivityUseCase {
  constructor(
    private readonly proxyService: IProxyService,
    private readonly llmProvider: ILLMProvider,
    private readonly config: {
      telegramProxyUrl?: string;
      telegramApiBase?: string;
      llmEndpoint?: string;
      llmApiKey?: string;
    }
  ) {}

  public async execute(): Promise<DiagnosticsReport> {
    const telegramStatus = await this.proxyService.checkTelegramConnectivity(
      this.config.telegramProxyUrl,
      this.config.telegramApiBase
    );

    const llmStatus = await this.proxyService.checkLLMConnectivity(
      this.config.llmEndpoint || 'https://api.groq.com/openai/v1/models',
      this.config.llmApiKey
    );

    const overallHealthy = telegramStatus.status === 'ok' && llmStatus.status === 'ok';

    let recommendation = 'Network routing optimal. All services reachable.';
    if (telegramStatus.status !== 'ok') {
      recommendation =
        'Telegram API blocked or degraded. Verify SOCKS5 proxy or configure Cloudflare reverse proxy endpoint.';
    } else if (llmStatus.status !== 'ok') {
      recommendation =
        'LLM provider endpoint unreachable. Verify API key and base URL routing.';
    }

    return {
      timestamp: new Date().toISOString(),
      telegramStatus,
      llmStatus,
      overallHealthy,
      recommendation,
    };
  }
}
