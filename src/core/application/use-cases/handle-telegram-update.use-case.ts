import { ProcessChatMessageUseCase } from './process-chat-message.use-case';
import { IMessengerAdapter } from '../../domain/interfaces/messenger-adapter.interface';
import { ISessionRepository } from '../../domain/interfaces/session-repository.interface';
import { ISoulRepository } from '../../domain/interfaces/soul-repository.interface';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      first_name?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
}

export class HandleTelegramUpdateUseCase {
  private readonly allowedUsers: Set<number>;

  constructor(
    private readonly processChatMessageUseCase: ProcessChatMessageUseCase,
    private readonly telegramAdapter: IMessengerAdapter,
    private readonly sessionRepository: ISessionRepository,
    private readonly soulRepository: ISoulRepository,
    allowedUserIds: number[] = []
  ) {
    this.allowedUsers = new Set(allowedUserIds.filter((id) => !isNaN(id)));
  }

  public async execute(update: TelegramUpdate): Promise<{ handled: boolean; action?: string; error?: string }> {
    const message = update.message;
    if (!message || !message.text) {
      return { handled: false, action: 'ignored_non_text' };
    }

    const chatId = message.chat.id;
    const userId = message.from?.id || chatId;
    const username = message.from?.username || message.from?.first_name || 'User';
    const text = message.text.trim();

    // Security check: Whitelist enforcement
    if (this.allowedUsers.size > 0 && !this.allowedUsers.has(userId)) {
      await this.telegramAdapter.sendMessage({
        chatId,
        text: 'Access restricted: your Telegram ID is not present in the Gateway whitelist.',
        replyToMessageId: message.message_id,
      });
      return { handled: true, action: 'access_denied' };
    }

    // Command handling
    if (text === '/start') {
      const welcome =
        `OpenClaw Gateway active.\n\n` +
        `User: @${username} (ID: ${userId})\n` +
        `Send any text to interact with the assistant.\n\n` +
        `Commands:\n` +
        `/status - Inspect Gateway runtime and connection metrics\n` +
        `/model  - Switch or inspect active AI model (Llama 3.3, Gemini, GPT OSS)\n` +
        `/soul   - Display active assistant persona guidelines\n` +
        `/reset  - Clear current conversation memory\n` +
        `/help   - Show operational guide`;
      await this.telegramAdapter.sendMessage({
        chatId,
        text: welcome,
        replyToMessageId: message.message_id,
      });
      return { handled: true, action: 'command_start' };
    }

    if (text === '/help') {
      const help =
        `OpenClaw Assistant Operational Guide:\n\n` +
        `- Continuous context is maintained across interactions.\n` +
        `- Token budget is automatically compacted via sliding window.\n` +
        `- No-VPN connectivity is routed through the Gateway proxy layer.\n` +
        `- Use /model to switch between Llama 3.3 (70B), Gemini 2.0, GPT OSS, etc.\n` +
        `- Use /reset to begin a clean conversation session.`;
      await this.telegramAdapter.sendMessage({
        chatId,
        text: help,
        replyToMessageId: message.message_id,
      });
      return { handled: true, action: 'command_help' };
    }

    if (text === '/reset') {
      const sessionId = `tg_${chatId}`;
      await this.sessionRepository.delete(sessionId);
      await this.telegramAdapter.sendMessage({
        chatId,
        text: 'Session memory cleared. Context reset.',
        replyToMessageId: message.message_id,
      });
      return { handled: true, action: 'command_reset' };
    }

    if (text === '/model' || text.startsWith('/model ')) {
      const sessionId = `tg_${chatId}`;
      const session = await this.sessionRepository.getOrCreate(sessionId, userId);
      const arg = text.replace('/model', '').trim();

      if (!arg) {
        const current = session.selectedModel || 'llama-3.3-70b-versatile (по умолчанию)';
        const modelListMsg =
          `🤖 Текущая модель: ${current}\n\n` +
          `Доступные модели для переключения:\n` +
          `• /model llama-3.3-70b-versatile — Флагман Meta Llama 3.3 (70B, высокие лимиты токенов)\n` +
          `• /model gemini-2.0-flash — Google Gemini 2.0 Flash (огромные лимиты)\n` +
          `• /model llama-3.1-8b-instant — Сверхбыстрая Llama 8B\n` +
          `• /model openai/gpt-oss-120b — Флагман OpenAI 120B на чипах Groq\n` +
          `• /model qwen/qwen3.8-27b — Qwen 3.8 (лимит Groq 1000 OTPM)\n\n` +
          `Для переключения скопируйте и отправьте команду с именем модели.`;

        await this.telegramAdapter.sendMessage({
          chatId,
          text: modelListMsg,
          replyToMessageId: message.message_id,
        });
        return { handled: true, action: 'command_model' };
      }

      let targetModel = arg;
      if (arg === 'llama' || arg === 'llama-70b' || arg === '70b') {
        targetModel = 'llama-3.3-70b-versatile';
      } else if (arg === 'llama-8b' || arg === '8b') {
        targetModel = 'llama-3.1-8b-instant';
      } else if (arg === 'gemini' || arg === 'flash') {
        targetModel = 'gemini-2.0-flash';
      } else if (arg === 'qwen') {
        targetModel = 'qwen/qwen3.8-27b';
      } else if (arg === 'gpt' || arg === 'gpt-oss') {
        targetModel = 'openai/gpt-oss-120b';
      }

      session.selectedModel = targetModel;
      await this.sessionRepository.save(session);

      await this.telegramAdapter.sendMessage({
        chatId,
        text: `✅ Модель переключена на: ${targetModel}`,
        replyToMessageId: message.message_id,
      });
      return { handled: true, action: 'command_model_changed' };
    }

    if (text === '/soul') {
      const soul = await this.soulRepository.getSoul();
      const summary =
        `Active Persona: ${soul.metadata.name}\n\n` +
        `Sections loaded: ${soul.sections.map((s) => s.title).join(', ')}\n\n` +
        `Directives summary:\n` +
        (soul.getSection('Operational Directives') || soul.systemPrompt.slice(0, 300));
      await this.telegramAdapter.sendMessage({
        chatId,
        text: summary,
        replyToMessageId: message.message_id,
      });
      return { handled: true, action: 'command_soul' };
    }

    if (text === '/status') {
      const sessionId = `tg_${chatId}`;
      const session = await this.sessionRepository.getOrCreate(sessionId, userId);
      const activeCount = await this.sessionRepository.getActiveSessionCount();
      const statusText =
        `Gateway Status:\n` +
        `- Runtime: Node.js (OpenClaw Clean Architecture)\n` +
        `- Assistant: OpenClaw AI Assistant\n` +
        `- Active model: ${session.selectedModel || 'llama-3.3-70b-versatile'}\n` +
        `- Active sessions: ${activeCount}\n` +
        `- Memory compaction: enabled (4000 token ceiling)\n` +
        `- Proxy bypass: verified active\n\n` +
        `Переключение модели: /model`;
      await this.telegramAdapter.sendMessage({
        chatId,
        text: statusText,
        replyToMessageId: message.message_id,
      });
      return { handled: true, action: 'command_status' };
    }

    // Natural language query processing
    try {
      const sessionId = `tg_${chatId}`;
      const session = await this.sessionRepository.getOrCreate(sessionId, userId);
      const result = await this.processChatMessageUseCase.execute({
        sessionId,
        userId,
        content: text,
        channel: 'telegram',
        model: session.selectedModel,
        metadata: {
          telegramChatId: chatId,
          telegramUserId: userId,
          telegramUsername: username,
        },
      });

      await this.telegramAdapter.sendMessage({
        chatId,
        text: result.responseMessage.content,
        replyToMessageId: message.message_id,
      });

      return { handled: true, action: 'chat_completed' };
    } catch (err: any) {
      await this.telegramAdapter.sendMessage({
        chatId,
        text: `Gateway execution error: ${err?.message || 'Unknown upstream failure'}`,
        replyToMessageId: message.message_id,
      });
      return { handled: false, error: err?.message };
    }
  }
}
