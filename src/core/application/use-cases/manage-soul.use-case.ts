import { SoulEntity } from '../../domain/entities/soul.entity';
import { ISoulRepository } from '../../domain/interfaces/soul-repository.interface';

export class ManageSoulUseCase {
  constructor(private readonly soulRepository: ISoulRepository) {}

  public async getActiveSoul(): Promise<SoulEntity> {
    return this.soulRepository.getSoul();
  }

  public async updateSoul(markdown: string): Promise<SoulEntity> {
    if (!markdown || !markdown.trim()) {
      throw new Error('SOUL content cannot be empty.');
    }
    return this.soulRepository.saveSoul(markdown);
  }
}
