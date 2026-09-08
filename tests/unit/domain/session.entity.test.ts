import { MessageEntity } from '../../../src/core/domain/entities/message.entity';
import { SessionEntity } from '../../../src/core/domain/entities/session.entity';

describe('SessionEntity', () => {
  it('should initialize empty session with valid timestamps', () => {
    const session = new SessionEntity('sess_test_1', 12345);
    expect(session.sessionId).toBe('sess_test_1');
    expect(session.userId).toBe(12345);
    expect(session.messages.length).toBe(0);
    expect(session.createdAt).toBeGreaterThan(0);
  });

  it('should add messages and update timestamp', () => {
    const session = new SessionEntity('sess_test_2');
    const msg = new MessageEntity({ role: 'user', content: 'Ping' });

    session.addMessage(msg);
    expect(session.messages.length).toBe(1);
    expect(session.messages[0].content).toBe('Ping');
  });

  it('should compact history under token threshold preserving recent messages', () => {
    const session = new SessionEntity('sess_compact');

    // Add 10 messages of 100 characters each (25 tokens each)
    for (let i = 0; i < 10; i++) {
      session.addMessage(
        new MessageEntity({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}: `.padEnd(100, '.'),
        })
      );
    }

    expect(session.messages.length).toBe(10);
    // Limit to 75 tokens (approx 3 messages)
    const compacted = session.compactHistory(75);
    expect(compacted.length).toBeLessThanOrEqual(3);
    expect(compacted[compacted.length - 1].content).toContain('Message 9');
  });

  it('should clear messages on clear()', () => {
    const session = new SessionEntity('sess_clear');
    session.addMessage(new MessageEntity({ role: 'user', content: 'hello' }));
    expect(session.messages.length).toBe(1);

    session.clear();
    expect(session.messages.length).toBe(0);
  });
});
