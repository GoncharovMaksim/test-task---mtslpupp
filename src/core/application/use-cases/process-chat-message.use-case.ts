import { MessageEntity } from '../../domain/entities/message.entity';
import { ILLMProvider } from '../../domain/interfaces/llm-provider.interface';
import { ISessionRepository } from '../../domain/interfaces/session-repository.interface';
import { ISoulRepository } from '../../domain/interfaces/soul-repository.interface';

export interface ProcessChatMessageRequest {
  sessionId: string;
  userId?: string | number;
  content: string;
  channel?: 'telegram' | 'web';
  metadata?: Record<string, any>;
}

export interface ProcessChatMessageResponse {
  sessionId: string;
  responseMessage: MessageEntity;
  latencyMs: number;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

export class ProcessChatMessageUseCase {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly soulRepository: ISoulRepository,
    private readonly llmProvider: ILLMProvider
  ) {}

  public async execute(request: ProcessChatMessageRequest): Promise<ProcessChatMessageResponse> {
    const trimmed = request.content.trim();
    if (!trimmed) {
      throw new Error('Message content cannot be empty.');
    }

    const session = await this.sessionRepository.getOrCreate(request.sessionId, request.userId);

    const userMessage = new MessageEntity({
      role: 'user',
      content: trimmed,
      metadata: {
        ...request.metadata,
        provider: this.llmProvider.providerName,
      },
    });
    session.addMessage(userMessage);

    const soul = await this.soulRepository.getSoul();
    const systemInstruction = soul.toSystemInstruction({
      SESSION_ID: request.sessionId,
      CURRENT_DATE: new Date().toISOString(),
      CHANNEL: request.channel || 'web',
    });

    const contextMessages = session.compactHistory(3500);

    const completion = await this.llmProvider.complete(contextMessages, {
      systemInstruction,
    });

    const assistantMessage = new MessageEntity({
      role: 'assistant',
      content: completion.content,
      metadata: {
        tokensUsed: completion.tokensUsed?.totalTokens,
        provider: completion.provider,
      },
    });
    session.addMessage(assistantMessage);
    await this.sessionRepository.save(session);

    return {
      sessionId: session.sessionId,
      responseMessage: assistantMessage,
      latencyMs: completion.latencyMs,
      tokensUsed: completion.tokensUsed,
      model: completion.model,
      provider: completion.provider,
    };
  }
}
