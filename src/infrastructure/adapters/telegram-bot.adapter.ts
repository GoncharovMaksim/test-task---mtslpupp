import { SocksProxyAgent } from 'socks-proxy-agent';
import {
  IMessengerAdapter,
  OutgoingMessagePayload,
} from '../../core/domain/interfaces/messenger-adapter.interface';

export class TelegramBotAdapter implements IMessengerAdapter {
  public readonly channelName = 'telegram';
  private readonly baseUrl: string;
  private socksAgent?: SocksProxyAgent;

  constructor(
    private readonly botToken: string,
    proxyUrl?: string,
    apiBase: string = 'https://api.telegram.org'
  ) {
    this.baseUrl = `${apiBase.replace(/\/$/, '')}/bot${botToken}`;
    if (proxyUrl && proxyUrl.startsWith('socks')) {
      try {
        this.socksAgent = new SocksProxyAgent(proxyUrl);
      } catch {
        this.socksAgent = undefined;
      }
    }
  }

  public async getMe(): Promise<{ ok: boolean; result?: any; description?: string }> {
    return this.callApi('getMe', {});
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
    const body: Record<string, any> = {
      chat_id: payload.chatId,
      text: payload.text,
    };

    if (payload.replyToMessageId) {
      body.reply_to_message_id = payload.replyToMessageId;
    }

    if (payload.parseMode) {
      body.parse_mode = payload.parseMode;
    }

    const res = await this.callApi('sendMessage', body);

    // If markdown fails due to formatting, retry with plain text
    if (!res.ok && payload.parseMode) {
      delete body.parse_mode;
      const retryRes = await this.callApi('sendMessage', body);
      return retryRes.ok;
    }

    return res.ok;
  }

  private async callApi(method: string, data: Record<string, any>): Promise<any> {
    if (!this.botToken) {
      return { ok: false, description: 'Telegram bot token is not configured.' };
    }

    const controller = new AbortController();
    const timeoutSeconds = method === 'getUpdates' && data.timeout ? data.timeout + 5 : 15;
    const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    const fetchOptions: any = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    };

    if (this.socksAgent) {
      fetchOptions.agent = this.socksAgent;
    }

    try {
      const res = await fetch(`${this.baseUrl}/${method}`, fetchOptions);
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
