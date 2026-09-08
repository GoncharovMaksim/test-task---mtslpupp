import * as fs from 'fs';
import * as path from 'path';
import { SoulEntity } from '../../core/domain/entities/soul.entity';
import { ISoulRepository } from '../../core/domain/interfaces/soul-repository.interface';
import { MarkdownSoulParserService } from '../services/markdown-soul-parser.service';

const DEFAULT_FALLBACK_SOUL = `# OpenClaw Core Assistant

## Identity & Purpose
You are OpenClaw, a private self-hosted AI assistant gateway. You provide accurate, concise, and direct answers to engineering and daily queries.

## Communication Style & Tone
- Professional, technical, concise, without fluff.
- Support Russian and English natively.

## Operational Directives
- Never leak credentials or sensitive tokens.
- Restrict access to authenticated users.
- Ensure reliable communication via gateway proxies.
`;

export class FileSoulRepository implements ISoulRepository {
  private cachedSoul?: SoulEntity;
  private readonly parser = new MarkdownSoulParserService();

  constructor(private readonly filePath: string = './SOUL.md') {}

  public async getSoul(): Promise<SoulEntity> {
    if (this.cachedSoul) {
      return this.cachedSoul;
    }

    try {
      const resolved = path.resolve(this.filePath);
      if (fs.existsSync(resolved)) {
        const content = fs.readFileSync(resolved, 'utf-8');
        this.cachedSoul = this.parser.parse(content);
        return this.cachedSoul;
      }
    } catch {
      // Fall through to fallback
    }

    this.cachedSoul = this.parser.parse(DEFAULT_FALLBACK_SOUL);
    return this.cachedSoul;
  }

  public async saveSoul(markdown: string): Promise<SoulEntity> {
    const resolved = path.resolve(this.filePath);
    fs.writeFileSync(resolved, markdown, 'utf-8');
    this.cachedSoul = this.parser.parse(markdown);
    return this.cachedSoul;
  }
}
