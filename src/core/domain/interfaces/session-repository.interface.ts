import { SessionEntity } from '../entities/session.entity';

export interface ISessionRepository {
  getOrCreate(sessionId: string, userId?: string | number): Promise<SessionEntity>;
  save(session: SessionEntity): Promise<void>;
  delete(sessionId: string): Promise<boolean>;
  getActiveSessionCount(): Promise<number>;
}
