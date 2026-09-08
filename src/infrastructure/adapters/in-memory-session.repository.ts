import { SessionEntity } from '../../core/domain/entities/session.entity';
import { ISessionRepository } from '../../core/domain/interfaces/session-repository.interface';

export class InMemorySessionRepository implements ISessionRepository {
  private readonly sessions = new Map<string, SessionEntity>();

  public async getOrCreate(sessionId: string, userId?: string | number): Promise<SessionEntity> {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }

    const newSession = new SessionEntity(sessionId, userId);
    this.sessions.set(sessionId, newSession);
    return newSession;
  }

  public async save(session: SessionEntity): Promise<void> {
    this.sessions.set(session.sessionId, session);
  }

  public async delete(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  public async getActiveSessionCount(): Promise<number> {
    return this.sessions.size;
  }

  public async clearAll(): Promise<void> {
    this.sessions.clear();
  }
}
