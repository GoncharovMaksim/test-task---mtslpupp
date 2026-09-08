import { SoulEntity } from '../../../src/core/domain/entities/soul.entity';

describe('SoulEntity', () => {
  const sampleMarkdown = `# OpenClaw Assistant

## Identity
You are a test assistant.

## Style
Concise and direct.
`;

  it('should retrieve parsed sections correctly', () => {
    const soul = new SoulEntity({
      rawMarkdown: sampleMarkdown,
      systemPrompt: sampleMarkdown,
      sections: [
        { title: 'Identity', content: 'You are a test assistant.' },
        { title: 'Style', content: 'Concise and direct.' },
      ],
    });

    expect(soul.getSection('Identity')).toBe('You are a test assistant.');
    expect(soul.getSection('Style')).toBe('Concise and direct.');
    expect(soul.getSection('NonExistent')).toBeUndefined();
  });

  it('should interpolate custom variables in system instruction', () => {
    const template = 'Hello {{USER}}, welcome to {{SYSTEM}}.';
    const soul = new SoulEntity({
      rawMarkdown: template,
      systemPrompt: template,
    });

    const interpolated = soul.toSystemInstruction({
      USER: 'Maksim',
      SYSTEM: 'OpenClaw Gateway',
    });

    expect(interpolated).toBe('Hello Maksim, welcome to OpenClaw Gateway.');
  });
});
