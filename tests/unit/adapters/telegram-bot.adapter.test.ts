import { TelegramBotAdapter } from '../../../src/infrastructure/adapters/telegram-bot.adapter';

jest.mock('../../../src/infrastructure/services/proxy-http-client', () => ({
  proxyFetch: jest.fn(),
}));

import { proxyFetch } from '../../../src/infrastructure/services/proxy-http-client';

describe('TelegramBotAdapter', () => {
  const mockProxyFetch = proxyFetch as jest.MockedFunction<typeof proxyFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send a short message directly without chunking', async () => {
    mockProxyFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 123 } }),
    } as any);

    const adapter = new TelegramBotAdapter('dummy-bot-token');
    const success = await adapter.sendMessage({
      chatId: 12345,
      text: 'Short message',
      replyToMessageId: 99,
    });

    expect(success).toBe(true);
    expect(mockProxyFetch).toHaveBeenCalledTimes(1);
    expect(mockProxyFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/botdummy-bot-token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          chat_id: 12345,
          text: 'Short message',
          reply_to_message_id: 99,
        }),
      })
    );
  });

  it('should split long messages exceeding 4000 characters into sequential chunks', async () => {
    mockProxyFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 123 } }),
    } as any);

    const adapter = new TelegramBotAdapter('dummy-bot-token');

    // Create a message with 2 paragraphs totaling ~5000 characters
    const p1 = 'A'.repeat(2500);
    const p2 = 'B'.repeat(2500);
    const longText = `${p1}\n\n${p2}`;

    const success = await adapter.sendMessage({
      chatId: 12345,
      text: longText,
      replyToMessageId: 99,
    });

    expect(success).toBe(true);
    expect(mockProxyFetch).toHaveBeenCalledTimes(2);

    // First call must have reply_to_message_id
    const firstCallBody = JSON.parse(mockProxyFetch.mock.calls[0][1].body as string);
    expect(firstCallBody.chat_id).toBe(12345);
    expect(firstCallBody.reply_to_message_id).toBe(99);
    expect(firstCallBody.text).toBe(p1);

    // Second call must NOT have reply_to_message_id
    const secondCallBody = JSON.parse(mockProxyFetch.mock.calls[1][1].body as string);
    expect(secondCallBody.chat_id).toBe(12345);
    expect(secondCallBody.reply_to_message_id).toBeUndefined();
    expect(secondCallBody.text).toBe(p2);
  });

  it('should retry without parse_mode if formatted markdown fails', async () => {
    // 1st call fails (markdown parsing error)
    mockProxyFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, description: "Bad Request: can't parse entities" }),
    } as any);

    // 2nd call succeeds (plain text retry)
    mockProxyFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 124 } }),
    } as any);

    const adapter = new TelegramBotAdapter('dummy-bot-token');
    const success = await adapter.sendMessage({
      chatId: 12345,
      text: 'Malformed *markdown',
      parseMode: 'Markdown',
    });

    expect(success).toBe(true);
    expect(mockProxyFetch).toHaveBeenCalledTimes(2);

    const firstCall = JSON.parse(mockProxyFetch.mock.calls[0][1].body as string);
    expect(firstCall.parse_mode).toBe('Markdown');

    const secondCall = JSON.parse(mockProxyFetch.mock.calls[1][1].body as string);
    expect(secondCall.parse_mode).toBeUndefined();
  });
});
