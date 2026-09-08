import { MessageEntity } from '../../../src/core/domain/entities/message.entity';

describe('MessageEntity', () => {
  it('should initialize with provided parameters and generate id if omitted', () => {
    const msg = new MessageEntity({
      role: 'user',
      content: 'Hello Gateway',
    });

    expect(msg.id).toBeDefined();
    expect(msg.id.startsWith('msg_')).toBe(true);
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello Gateway');
    expect(msg.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should estimate tokens proportionally to character length', () => {
    const shortMsg = new MessageEntity({ role: 'user', content: 'test' });
    expect(shortMsg.estimateTokens()).toBe(1);

    const longMsg = new MessageEntity({
      role: 'assistant',
      content: 'a'.repeat(400),
    });
    expect(longMsg.estimateTokens()).toBe(100);
  });

  it('should serialize correctly to JSON', () => {
    const msg = new MessageEntity({
      id: 'custom-123',
      role: 'assistant',
      content: 'Sample response',
      metadata: { provider: 'groq', tokensUsed: 15 },
    });

    const json = msg.toJSON();
    expect(json.id).toBe('custom-123');
    expect(json.role).toBe('assistant');
    expect(json.content).toBe('Sample response');
    expect(json.metadata?.provider).toBe('groq');
    expect(json.metadata?.tokensUsed).toBe(15);
  });
});
