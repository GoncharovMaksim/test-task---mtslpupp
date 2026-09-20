import { TelegramFormatService } from '../../../src/infrastructure/services/telegram-format.service';

describe('TelegramFormatService', () => {
  it('should clean simple inline LaTeX formulas', () => {
    const input = 'Согласно правилам математики:\n1. $2 \\times 2 = 4$\n2. $2 + 4 = 6$\n\nОтвет: 6';
    const expected = 'Согласно правилам математики:\n1. 2 × 2 = 4\n2. 2 + 4 = 6\n\nОтвет: 6';
    expect(TelegramFormatService.sanitize(input)).toBe(expected);
  });

  it('should convert display math and fractions', () => {
    const input = '$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$';
    const output = TelegramFormatService.sanitize(input);
    expect(output).toContain('x = (-b ± √(b^2 - 4ac)) / (2a)');
    expect(output).not.toContain('$$');
    expect(output).not.toContain('\\frac');
  });

  it('should convert LaTeX text and bold styling', () => {
    const input = 'Формула: $\\mathbf{F} = m \\cdot \\mathbf{a}$, где $\\text{F} - \\text{сила}$';
    const output = TelegramFormatService.sanitize(input);
    expect(output).toBe('Формула: *F* = m · *a*, где F - сила');
  });

  it('should preserve currency amounts', () => {
    const input = 'Цена подписки $100 в месяц или $50 со скидкой.';
    const output = TelegramFormatService.sanitize(input);
    expect(output).toBe('Цена подписки $100 в месяц или $50 со скидкой.');
  });

  it('should preserve code blocks unchanged', () => {
    const input = 'Код:\n```python\nx = $val\nprint("\\times")\n```\nТекст: $2 \\times 2 = 4$';
    const output = TelegramFormatService.sanitize(input);
    expect(output).toContain('```python\nx = $val\nprint("\\times")\n```');
    expect(output).toContain('Текст: 2 × 2 = 4');
  });

  describe('splitMessage', () => {
    it('should return single chunk if text is within maxLength', () => {
      const text = 'Hello world!';
      const chunks = TelegramFormatService.splitMessage(text, 100);
      expect(chunks).toEqual(['Hello world!']);
    });

    it('should return empty array for empty string', () => {
      expect(TelegramFormatService.splitMessage('', 100)).toEqual([]);
    });

    it('should split along paragraph breaks when text exceeds maxLength', () => {
      const p1 = 'Paragraph 1 content that is fairly long and detailed.';
      const p2 = 'Paragraph 2 content that follows the first paragraph.';
      const full = `${p1}\n\n${p2}`;
      const chunks = TelegramFormatService.splitMessage(full, 60);

      expect(chunks.length).toBe(2);
      expect(chunks[0]).toBe(p1);
      expect(chunks[1]).toBe(p2);
    });

    it('should split along newlines if no paragraph breaks available', () => {
      const line1 = 'Line 1: first point of data';
      const line2 = 'Line 2: second point of data';
      const full = `${line1}\n${line2}`;
      const chunks = TelegramFormatService.splitMessage(full, 35);

      expect(chunks.length).toBe(2);
      expect(chunks[0]).toBe(line1);
      expect(chunks[1]).toBe(line2);
    });

    it('should split along sentence boundaries if no newlines exist', () => {
      const s1 = 'This is the first sentence.';
      const s2 = 'This is the second sentence after the first.';
      const full = `${s1} ${s2}`;
      const chunks = TelegramFormatService.splitMessage(full, 50);

      expect(chunks.length).toBe(2);
      expect(chunks[0]).toBe(s1);
      expect(chunks[1]).toBe(s2);
    });

    it('should safely close and reopen unclosed markdown code blocks across chunks', () => {
      const codeSnippet = '```typescript\nconst a = 1;\nconst b = 2;\nconst c = 3;\n```';
      const chunks = TelegramFormatService.splitMessage(codeSnippet, 35);

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      // First chunk must end with ```
      expect(chunks[0].endsWith('```')).toBe(true);
      // Next chunk must start with ```
      expect(chunks[1].startsWith('```')).toBe(true);
    });
  });
});

