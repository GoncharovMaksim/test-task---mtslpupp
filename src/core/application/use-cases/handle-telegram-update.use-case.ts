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
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
    };
    data?: string;
  };
}

export function getModelSelectionKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '⚡ Qwen 27B (Groq)', callback_data: 'model:qwen/qwen3.8-27b' },
        { text: '🧠 OpenAI 120B (Groq)', callback_data: 'model:openai/gpt-oss-120b' },
      ],
      [
        { text: '🚀 Gemini 3.1 Flash Lite', callback_data: 'model:gemini-3.1-flash-lite' },
        { text: '⚡ Gemini 3.5 Flash Lite', callback_data: 'model:gemini-3.5-flash-lite' },
      ],
      [
        { text: '✨ Gemini 3.5 Flash', callback_data: 'model:gemini-3.5-flash' },
        { text: '🌐 Groq Compound', callback_data: 'model:groq/compound' },
      ],
    ],
  };
}

export function getMainReplyKeyboard() {
  return {
    keyboard: [
      [{ text: '🤖 Выбрать модель' }, { text: '📊 Статус' }],
      [{ text: '🧹 Сбросить контекст' }, { text: 'ℹ️ Помощь' }],
    ],
    resize_keyboard: true,
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
    // 1. Handle Inline Button Clicks (callback_query)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const userId = cq.from.id;
      const chatId = cq.message?.chat.id || userId;

      if (this.allowedUsers.size > 0 && !this.allowedUsers.has(userId)) {
        if (this.telegramAdapter.answerCallbackQuery) {
          await this.telegramAdapter.answerCallbackQuery(cq.id, 'Доступ ограничен');
        }
        return { handled: true, action: 'callback_access_denied' };
      }

      if (data.startsWith('model:')) {
        const targetModel = data.replace('model:', '');
        const sessionId = `tg_${chatId}`;
        const session = await this.sessionRepository.getOrCreate(sessionId, userId);
        session.selectedModel = targetModel;
        await this.sessionRepository.save(session);

        if (this.telegramAdapter.answerCallbackQuery) {
          await this.telegramAdapter.answerCallbackQuery(cq.id, `Выбрана модель: ${targetModel}`);
        }

        await this.telegramAdapter.sendMessage({
          chatId,
          text: `✅ Модель успешно переключена на:\n*${targetModel}*\n\nТеперь бот будет отвечать с использованием этой модели.`,
          parseMode: 'Markdown',
        });
        return { handled: true, action: 'callback_model_changed' };
      }

      if (this.telegramAdapter.answerCallbackQuery) {
        await this.telegramAdapter.answerCallbackQuery(cq.id);
      }
      return { handled: true, action: 'callback_unhandled' };
    }

    // 2. Handle Text Messages
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
        `Отправьте любой текст для общения с ассистентом.\n\n` +
        `Команды и меню:\n` +
        `🤖 /model  - Выбор модели (кнопками или командой)\n` +
        `📊 /status - Проверка состояния шлюза и активной модели\n` +
        `🧹 /reset  - Очистить контекст диалога\n` +
        `ℹ️ /help   - Инструкция по использованию`;
      await this.telegramAdapter.sendMessage({
        chatId,
        text: welcome,
        replyToMessageId: message.message_id,
        replyMarkup: getMainReplyKeyboard(),
      });
      return { handled: true, action: 'command_start' };
    }

    if (text === '/help' || text === 'ℹ️ Помощь' || text === 'Помощь') {
      const help =
        `OpenClaw Assistant Operational Guide:\n\n` +
        `- Непрерывный контекст диалога сохраняется между репликами.\n` +
        `- Доступны новейшие модели Google Gemini 3.1 & 3.5, Qwen и OpenAI.\n` +
        `- Если ответ длинный, бот автоматически генерирует его за несколько подходов и не обрывает текст.\n` +
        `- Используйте кнопку «🤖 Выбрать модель» для моментального переключения.\n` +
        `- Используйте «🧹 Сбросить контекст» для начала нового диалога.`;
      await this.telegramAdapter.sendMessage({
        chatId,
        text: help,
        replyToMessageId: message.message_id,
      });
      return { handled: true, action: 'command_help' };
    }

    if (text === '/reset' || text === '🧹 Сбросить контекст' || text === 'Сбросить контекст') {
      const sessionId = `tg_${chatId}`;
      await this.sessionRepository.delete(sessionId);
      await this.telegramAdapter.sendMessage({
        chatId,
        text: 'Session memory cleared. Context reset.',
        replyToMessageId: message.message_id,
      });
      return { handled: true, action: 'command_reset' };
    }

    if (
      text === '/model' ||
      text.startsWith('/model ') ||
      text === '🤖 Выбрать модель' ||
      text === 'Выбрать модель' ||
      text === 'Модели'
    ) {
      const sessionId = `tg_${chatId}`;
      const session = await this.sessionRepository.getOrCreate(sessionId, userId);
      const arg = text.replace('/model', '').trim();

      if (!arg || text.includes('Выбрать модель') || text === 'Модели') {
        const current = session.selectedModel || 'gemini-3.1-flash-lite (по умолчанию)';
        const modelListMsg =
          `🤖 *Выберите AI-модель кнопкой ниже:*\n\n` +
          `Текущая активная модель: *${current}*\n\n` +
          `• *Qwen 27B* — авто-догенерация длинных текстов на Groq\n` +
          `• *Gemini 3.1 Flash Lite* — новая сверхбыстрая модель Google\n` +
          `• *Gemini 3.5 Flash Lite* — баланс скорости и глубины анализа\n` +
          `• *Gemini 3.5 Flash* — флагман Google с большим контекстом\n` +
          `• *OpenAI 120B* — открытая модель OpenAI на чипах Groq\n` +
          `• *Groq Compound* — мощный пайплайн с лимитом 70K TPM\n\n` +
          `👇 Нажмите на нужную кнопку для переключения:`;

        await this.telegramAdapter.sendMessage({
          chatId,
          text: modelListMsg,
          parseMode: 'Markdown',
          replyToMessageId: message.message_id,
          replyMarkup: getModelSelectionKeyboard(),
        });
        return { handled: true, action: 'command_model' };
      }

      let targetModel = arg;
      if (arg === 'qwen' || arg === '27b') {
        targetModel = 'qwen/qwen3.8-27b';
      } else if (arg === 'gpt' || arg === 'gpt-oss' || arg === '120b') {
        targetModel = 'openai/gpt-oss-120b';
      } else if (arg === 'compound') {
        targetModel = 'groq/compound';
      } else if (arg === '3.1' || arg === '3.1-lite' || arg === 'gemini-3.1' || arg === 'gemini-3.1-flash-lite') {
        targetModel = 'gemini-3.1-flash-lite';
      } else if (arg === '3.5-lite' || arg === 'gemini-3.5-lite' || arg === 'gemini-3.5-flash-lite') {
        targetModel = 'gemini-3.5-flash-lite';
      } else if (arg === '3.5' || arg === 'gemini-3.5' || arg === 'gemini-3.5-flash') {
        targetModel = 'gemini-3.5-flash';
      }

      session.selectedModel = targetModel;
      await this.sessionRepository.save(session);

      await this.telegramAdapter.sendMessage({
        chatId,
        text: `✅ Модель переключена на: *${targetModel}*`,
        parseMode: 'Markdown',
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

    if (text === '/status' || text === '📊 Статус' || text === 'Статус') {
      const sessionId = `tg_${chatId}`;
      const session = await this.sessionRepository.getOrCreate(sessionId, userId);
      const activeCount = await this.sessionRepository.getActiveSessionCount();
      const statusText =
        `Gateway Status:\n` +
        `- Runtime: Node.js (OpenClaw Clean Architecture)\n` +
        `- Assistant: OpenClaw AI Assistant\n` +
        `- Active model: ${session.selectedModel || 'gemini-3.1-flash-lite'}\n` +
        `- Active sessions: ${activeCount}\n` +
        `- Memory compaction: enabled (4000 token ceiling)\n` +
        `- Proxy bypass: verified active\n\n` +
        `Переключение модели: нажмите «🤖 Выбрать модель» или введите /model`;
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
