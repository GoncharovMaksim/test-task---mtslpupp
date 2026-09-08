import { GetGatewayStatusUseCase } from '../core/application/use-cases/get-gateway-status.use-case';
import { HandleTelegramUpdateUseCase } from '../core/application/use-cases/handle-telegram-update.use-case';
import { ManageSoulUseCase } from '../core/application/use-cases/manage-soul.use-case';
import { ProcessChatMessageUseCase } from '../core/application/use-cases/process-chat-message.use-case';
import { TestConnectivityUseCase } from '../core/application/use-cases/test-connectivity.use-case';
import { FileSoulRepository } from './adapters/file-soul.repository';
import { GroqLLMAdapter } from './adapters/groq-llm.adapter';
import { InMemorySessionRepository } from './adapters/in-memory-session.repository';
import { TelegramBotAdapter } from './adapters/telegram-bot.adapter';
import { loadGatewayConfig } from './config/gateway.config';
import { NetworkProxyService } from './services/network-proxy.service';

class Container {
  private static instance: Container;

  public readonly config = loadGatewayConfig();
  public readonly sessionRepository = new InMemorySessionRepository();
  public readonly soulRepository = new FileSoulRepository(this.config.soulFilePath);
  public readonly proxyService = new NetworkProxyService(this.config.telegram.proxyUrl);

  public readonly llmProvider = new GroqLLMAdapter(
    this.config.llm.groqApiKey,
    this.config.llm.groqModel,
    'https://api.groq.com/openai/v1',
    this.config.llm.proxyUrl || this.config.proxyUrl
  );

  public readonly telegramAdapter = new TelegramBotAdapter(
    this.config.telegram.botToken,
    this.config.telegram.proxyUrl,
    this.config.telegram.apiBase
  );

  public readonly processChatMessageUseCase = new ProcessChatMessageUseCase(
    this.sessionRepository,
    this.soulRepository,
    this.llmProvider
  );

  public readonly handleTelegramUpdateUseCase = new HandleTelegramUpdateUseCase(
    this.processChatMessageUseCase,
    this.telegramAdapter,
    this.sessionRepository,
    this.soulRepository,
    this.config.telegram.allowedUsers
  );

  public readonly manageSoulUseCase = new ManageSoulUseCase(this.soulRepository);

  public readonly testConnectivityUseCase = new TestConnectivityUseCase(
    this.proxyService,
    this.llmProvider,
    {
      telegramProxyUrl: this.config.telegram.proxyUrl,
      telegramApiBase: this.config.telegram.apiBase,
      llmEndpoint: 'https://api.groq.com/openai/v1/models',
      llmApiKey: this.config.llm.groqApiKey,
    }
  );

  public readonly getGatewayStatusUseCase = new GetGatewayStatusUseCase(
    this.sessionRepository,
    this.soulRepository
  );

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}

export const container = Container.getInstance();
