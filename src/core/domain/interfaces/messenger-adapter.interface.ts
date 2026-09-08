export interface IncomingMessagePayload {
  channel: 'telegram' | 'web';
  userId: string | number;
  chatId: string | number;
  username?: string;
  text: string;
  messageId: string | number;
  timestamp: number;
}

export interface OutgoingMessagePayload {
  chatId: string | number;
  text: string;
  replyToMessageId?: string | number;
  parseMode?: 'Markdown' | 'HTML';
}

export interface IMessengerAdapter {
  readonly channelName: string;
  sendMessage(payload: OutgoingMessagePayload): Promise<boolean>;
  verifyWebhook?(secretToken?: string): boolean;
}
