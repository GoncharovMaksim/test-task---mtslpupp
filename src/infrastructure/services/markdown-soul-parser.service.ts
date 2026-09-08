import { ParsedSoulSection, SoulEntity, SoulMetadata } from '../../core/domain/entities/soul.entity';

export class MarkdownSoulParserService {
  public parse(markdown: string): SoulEntity {
    const lines = markdown.split('\n');
    let title = 'OpenClaw Assistant';
    const sections: ParsedSoulSection[] = [];

    let currentSectionTitle = '';
    let currentSectionContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        title = line.replace('# ', '').trim();
        continue;
      }

      if (line.startsWith('## ')) {
        if (currentSectionTitle) {
          sections.push({
            title: currentSectionTitle,
            content: currentSectionContent.join('\n').trim(),
          });
        }
        currentSectionTitle = line.replace('## ', '').trim();
        currentSectionContent = [];
        continue;
      }

      currentSectionContent.push(line);
    }

    if (currentSectionTitle) {
      sections.push({
        title: currentSectionTitle,
        content: currentSectionContent.join('\n').trim(),
      });
    }

    const metadata: SoulMetadata = {
      name: title,
      version: '1.0.0',
    };

    return new SoulEntity({
      rawMarkdown: markdown,
      metadata,
      systemPrompt: markdown,
      sections,
    });
  }
}
