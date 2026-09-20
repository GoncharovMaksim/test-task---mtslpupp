import {
  IMessengerAdapter,
  OutgoingMessagePayload,
} from '../../core/domain/interfaces/messenger-adapter.interface';
import { proxyFetch } from '../services/proxy-http-client';
import { TelegramFormatService } from '../services/telegram-format.service';

export class TelegramBotAdapter implements IMessengerAdapter {
  public readonly channelName = 'telegram';
  private readonly baseUrl: string;

  constructor(
    private readonly botToken: string,
    private readonly proxyUrl?: string,
    apiBase: string = 'https://api.telegram.org'
  ) {
    this.baseUrl = `${apiBase.replace(/\/$/, '')}/bot${botToken}`;
  }


  public async getMe(): Promise<{ ok: boolean; result?: any; description?: string }> {
    return this.callApi('getMe', {});
  }

  public async getWebhookInfo(): Promise<{ ok: boolean; result?: any; description?: string }> {
    return this.callApi('getWebhookInfo', {});
  }

  public async setWebhook(url: string, secretToken?: string): Promise<boolean> {
    const payload: Record<string, any> = { url };
    if (secretToken) {
      payload.secret_token = secretToken;
    }
    const res = await this.callApi('setWebhook', payload);
    return res.ok;
  }

  public async deleteWebhook(): Promise<boolean> {
    const res = await this.callApi('deleteWebhook', { drop_pending_updates: false });
    return res.ok;
  }

  public async getUpdates(offset?: number, timeout = 20): Promise<any[]> {
    const res = await this.callApi('getUpdates', {
      offset,
      timeout,
      allowed_updates: ['message'],
    });
    return res.ok && Array.isArray(res.result) ? res.result : [];
  }

  public async sendMessage(payload: OutgoingMessagePayload): Promise<boolean> {
    const text = TelegramFormatService.sanitize(payload.text);
    const chunks = TelegramFormatService.splitMessage(text, 4000);

    if (chunks.length === 0) {
      return false;
    }

    let allOk = true;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const body: Record<string, any> = {
        chat_id: payload.chatId,
        text: chunk,
      };

      if (i === 0 && payload.replyToMessageId) {
        body.reply_to_message_id = payload.replyToMessageId;
      }

      if (payload.parseMode) {
        body.parse_mode = payload.parseMode;
      }

      const res = await this.callApi('sendMessage', body);
      let chunkOk = res.ok;

      // If markdown fails due to formatting, retry with plain text
      if (!res.ok && payload.parseMode) {
        delete body.parse_mode;
        const retryRes = await this.callApi('sendMessage', body);
        chunkOk = retryRes.ok;
      }

      if (!chunkOk) {
        allOk = false;
      }

      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }

    return allOk;
  }

  private async callApi(method: string, data: Record<string, any>): Promise<any> {
    if (!this.botToken) {
      return { ok: false, description: 'Telegram bot token is not configured.' };
    }

    const controller = new AbortController();
    const timeoutSeconds = method === 'getUpdates' && data.timeout ? data.timeout + 5 : 15;
    const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    try {
      const res = await proxyFetch(`${this.baseUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
        proxyUrl: this.proxyUrl,
      });
      clearTimeout(timer);
      return await res.json();
    } catch (err: any) {
      clearTimeout(timer);
      return {
        ok: false,
        description: err.name === 'AbortError' ? 'Request timed out' : err.message,
      };
    }
  }
}

