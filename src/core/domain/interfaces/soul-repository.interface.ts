import { SoulEntity } from '../entities/soul.entity';

export interface ISoulRepository {
  getSoul(): Promise<SoulEntity>;
  saveSoul(markdown: string): Promise<SoulEntity>;
}
