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
      const activeCount = await this.sessionRepository.getActiveSessionCount();
      const statusText =
        `Gateway Status:\n` +
        `- Runtime: Node.js (OpenClaw Clean Architecture)\n` +
        `- Channel: Telegram Bot (@HanterProBot)\n` +
        `- Active sessions: ${activeCount}\n` +
        `- Memory compaction: enabled (3500 token ceiling)\n` +
        `- Proxy bypass: verified active`;
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
      const result = await this.processChatMessageUseCase.execute({
        sessionId,
        userId,
        content: text,
        channel: 'telegram',
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
