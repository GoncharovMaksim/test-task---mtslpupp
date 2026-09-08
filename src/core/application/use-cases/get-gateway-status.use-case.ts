import { ISessionRepository } from '../../domain/interfaces/session-repository.interface';
import { ISoulRepository } from '../../domain/interfaces/soul-repository.interface';

export interface GatewayStatusResponse {
  name: string;
  version: string;
  uptimeSeconds: number;
  environment: string;
  activeSessions: number;
  soulName: string;
  memoryUsageMb: number;
  features: {
    telegramBot: boolean;
    proxyBypass: boolean;
    memoryCompaction: boolean;
    livePlayground: boolean;
  };
}

export class GetGatewayStatusUseCase {
  private readonly startTime = Date.now();

  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly soulRepository: ISoulRepository
  ) {}

  public async execute(): Promise<GatewayStatusResponse> {
    const activeSessions = await this.sessionRepository.getActiveSessionCount();
    const soul = await this.soulRepository.getSoul();
    const memory = process.memoryUsage();

    return {
      name: 'OpenClaw Gateway',
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      activeSessions,
      soulName: soul.metadata.name,
      memoryUsageMb: Math.round((memory.heapUsed / 1024 / 1024) * 10) / 10,
      features: {
        telegramBot: true,
        proxyBypass: true,
        memoryCompaction: true,
        livePlayground: true,
      },
    };
  }
}
