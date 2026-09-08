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
});
