import { MessageEntity } from '../../core/domain/entities/message.entity';
import {
  CompletionOptions,
  CompletionResult,
  ILLMProvider,
} from '../../core/domain/interfaces/llm-provider.interface';

export class MultiProviderLLMAdapter implements ILLMProvider {
  constructor(
    private readonly defaultProvider: ILLMProvider,
    private readonly providers: {
      groq?: ILLMProvider;
      gemini?: ILLMProvider;
      [key: string]: ILLMProvider | undefined;
    }
  ) {}

  public get providerName(): string {
    return this.defaultProvider.providerName;
  }

  public getProviderForModel(model?: string): ILLMProvider {
    if (model) {
      const m = model.toLowerCase();
      if (m.startsWith('gemini') && this.providers.gemini) {
        return this.providers.gemini;
      }
      if (
        (m.startsWith('llama') ||
          m.startsWith('qwen') ||
          m.startsWith('deepseek') ||
          m.startsWith('openai/') ||
          m.startsWith('groq/') ||
          m.startsWith('allam')) &&
        this.providers.groq
      ) {
        return this.providers.groq;
      }
    }
    return this.defaultProvider;
  }

  public async complete(
    messages: MessageEntity[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const provider = this.getProviderForModel(options?.model);
    return provider.complete(messages, options);
  }

  public async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    return this.defaultProvider.testConnection();
  }
}
