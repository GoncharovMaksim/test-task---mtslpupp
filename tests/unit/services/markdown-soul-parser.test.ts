import { MarkdownSoulParserService } from '../../../src/infrastructure/services/markdown-soul-parser.service';

describe('MarkdownSoulParserService', () => {
  const parser = new MarkdownSoulParserService();

  it('should parse markdown title and header sections', () => {
    const md = `# OpenClaw Custom Core

## Identity & Purpose
Autonomous agent for self-hosted execution.

## Directives
1. Strictly follow security policies.
2. Never execute unsafe commands.
`;

    const soul = parser.parse(md);
    expect(soul.metadata.name).toBe('OpenClaw Custom Core');
    expect(soul.sections.length).toBe(2);
    expect(soul.sections[0].title).toBe('Identity & Purpose');
    expect(soul.sections[0].content).toContain('Autonomous agent for self-hosted execution.');
    expect(soul.sections[1].title).toBe('Directives');
    expect(soul.sections[1].content).toContain('Strictly follow security policies.');
  });

  it('should handle markdown without section headers gracefully', () => {
    const raw = 'Plain instruction text without headers.';
    const soul = parser.parse(raw);
    expect(soul.metadata.name).toBe('OpenClaw Assistant');
    expect(soul.systemPrompt).toBe(raw);
    expect(soul.sections.length).toBe(0);
  });
});
