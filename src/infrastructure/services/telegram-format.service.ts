/**
 * Service to sanitize and format messages destined for Telegram.
 * Telegram has no built-in LaTeX rendering engine, so expressions like
 * `$2 \times 2 = 4$` or `\frac{a}{b}` or `\mathbf{X}` are displayed as
 * raw dollar signs and markup.
 *
 * This sanitizer converts LaTeX syntax into human-readable plain text
 * with clean Unicode mathematical symbols and standard Telegram Markdown.
 */

function extractBraceContent(
  str: string,
  startIndex: number
): { content: string; endIndex: number } | null {
  if (str[startIndex] !== '{') return null;
  let depth = 0;
  const start = startIndex + 1;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return { content: str.slice(start, i), endIndex: i };
      }
    }
  }
  return null;
}

function replaceFractions(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('\\frac', i)) {
      let idx = i + 5;
      while (idx < text.length && /\s/.test(text[idx])) idx++;
      const num = extractBraceContent(text, idx);
      if (num) {
        let idx2 = num.endIndex + 1;
        while (idx2 < text.length && /\s/.test(text[idx2])) idx2++;
        const den = extractBraceContent(text, idx2);
        if (den) {
          result += `(${replaceFractions(num.content)}) / (${replaceFractions(den.content)})`;
          i = den.endIndex + 1;
          continue;
        }
      }
    }
    result += text[i];
    i++;
  }
  return result;
}

function replaceRoots(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('\\sqrt', i)) {
      let idx = i + 5;
      while (idx < text.length && /\s/.test(text[idx])) idx++;
      let degree = '';
      if (text[idx] === '[') {
        const closeBracket = text.indexOf(']', idx);
        if (closeBracket !== -1) {
          degree = text.slice(idx + 1, closeBracket);
          idx = closeBracket + 1;
          while (idx < text.length && /\s/.test(text[idx])) idx++;
        }
      }
      const body = extractBraceContent(text, idx);
      if (body) {
        const prefix = degree ? `^${degree}` : '';
        result += `${prefix}√(${replaceRoots(body.content)})`;
        i = body.endIndex + 1;
        continue;
      }
    }
    result += text[i];
    i++;
  }
  return result;
}

function replaceTextCommands(text: string): string {
  const commands = [
    { cmd: '\\mathbf', wrap: (s: string) => `*${s}*` },
    { cmd: '\\textbf', wrap: (s: string) => `*${s}*` },
    { cmd: '\\textit', wrap: (s: string) => `_${s}_` },
    { cmd: '\\mathit', wrap: (s: string) => `_${s}_` },
    { cmd: '\\text', wrap: (s: string) => s },
    { cmd: '\\mathrm', wrap: (s: string) => s },
    { cmd: '\\operatorname', wrap: (s: string) => s },
  ];

  let result = text;
  for (const { cmd, wrap } of commands) {
    let i = 0;
    let newRes = '';
    while (i < result.length) {
      if (result.startsWith(cmd, i)) {
        let idx = i + cmd.length;
        while (idx < result.length && /\s/.test(result[idx])) idx++;
        const content = extractBraceContent(result, idx);
        if (content) {
          newRes += wrap(replaceTextCommands(content.content));
          i = content.endIndex + 1;
          continue;
        }
      }
      newRes += result[i];
      i++;
    }
    result = newRes;
  }
  return result;
}

export class TelegramFormatService {
  /**
   * Cleans and formats text for Telegram.
   */
  public static sanitize(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Step 1: Temporarily extract code blocks (```...``` and `...`) to preserve them
    const codeBlocks: string[] = [];
    let processed = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
      codeBlocks.push(match);
      return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
    });

    // Step 2: Strip display/block LaTeX math: $$...$$ and \[...\]
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => inner.trim());
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => inner.trim());

    // Step 3: Strip inline LaTeX wrappers: \(...\)
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => inner.trim());

    // Step 4: Handle fractions and roots with balanced braces
    processed = replaceFractions(processed);
    processed = replaceRoots(processed);
    processed = replaceTextCommands(processed);

    // Step 5: Convert common LaTeX commands and mathematical symbols to Unicode
    const symbolReplacements: Array<[RegExp, string]> = [
      [/\\times\b/g, '×'],
      [/\\cdot\b/g, '·'],
      [/\\div\b/g, '÷'],
      [/\\pm\b/g, '±'],
      [/\\mp\b/g, '∓'],
      [/\\neq\b/g, '≠'],
      [/\\leq?\b/g, '≤'],
      [/\\geq?\b/g, '≥'],
      [/\\approx\b/g, '≈'],
      [/\\equiv\b/g, '≡'],
      [/\\sim\b/g, '~'],
      [/\\infty\b/g, '∞'],
      [/\\to\b|\\rightarrow\b/g, '→'],
      [/\\leftarrow\b/g, '←'],
      [/\\Rightarrow\b/g, '⇒'],
      [/\\Leftarrow\b/g, '⇐'],
      [/\\leftrightarrow\b/g, '↔'],
      [/\\forall\b/g, '∀'],
      [/\\exists\b/g, '∃'],
      [/\\in\b/g, '∈'],
      [/\\notin\b/g, '∉'],
      [/\\subset\b/g, '⊂'],
      [/\\subseteq\b/g, '⊆'],
      [/\\cup\b/g, '∪'],
      [/\\cap\b/g, '∩'],
      [/\\sum\b/g, '∑'],
      [/\\prod\b/g, '∏'],
      [/\\int\b/g, '∫'],
      [/\\partial\b/g, '∂'],
      [/\\nabla\b/g, '∇'],
      [/\\degree\b|\\circ\b/g, '°'],
      [/\\alpha\b/g, 'α'],
      [/\\beta\b/g, 'β'],
      [/\\gamma\b/g, 'γ'],
      [/\\delta\b/g, 'δ'],
      [/\\epsilon\b|\\varepsilon\b/g, 'ε'],
      [/\\zeta\b/g, 'ζ'],
      [/\\eta\b/g, 'η'],
      [/\\theta\b/g, 'θ'],
      [/\\iota\b/g, 'ι'],
      [/\\kappa\b/g, 'κ'],
      [/\\lambda\b/g, 'λ'],
      [/\\mu\b/g, 'μ'],
      [/\\nu\b/g, 'ν'],
      [/\\xi\b/g, 'ξ'],
      [/\\pi\b/g, 'π'],
      [/\\rho\b/g, 'ρ'],
      [/\\sigma\b/g, 'σ'],
      [/\\tau\b/g, 'τ'],
      [/\\upsilon\b/g, 'υ'],
      [/\\phi\b|\\varphi\b/g, 'φ'],
      [/\\chi\b/g, 'χ'],
      [/\\psi\b/g, 'ψ'],
      [/\\omega\b/g, 'ω'],
      [/\\Gamma\b/g, 'Γ'],
      [/\\Delta\b/g, 'Δ'],
      [/\\Theta\b/g, 'Θ'],
      [/\\Lambda\b/g, 'Λ'],
      [/\\Xi\b/g, 'Ξ'],
      [/\\Pi\b/g, 'Π'],
      [/\\Sigma\b/g, 'Σ'],
      [/\\Phi\b/g, 'Φ'],
      [/\\Psi\b/g, 'Ψ'],
      [/\\Omega\b/g, 'Ω'],
      [/\\quad\b|\\qquad\b/g, '  '],
      [/\\,|\\;|\\!/g, ' '],
    ];

    for (const [regex, rep] of symbolReplacements) {
      processed = processed.replace(regex, rep);
    }

    // Step 6: Left/right grouping delimiters
    processed = processed.replace(/\\left([(\[{|])/g, '$1');
    processed = processed.replace(/\\right([)\]}|])/g, '$1');
    processed = processed.replace(/\\\{/g, '{').replace(/\\\}/g, '}');

    // Step 7: Strip inline math dollar signs ($...$) when not currency
    // Valid math delimiter: non-space immediately after opening $, non-space before closing $
    // e.g. `$2 × 2 = 4$` -> `2 × 2 = 4`
    // Does not match `$100` or `$100 в месяц или $50`
    processed = processed.replace(/(?<!\\|\w)\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\w)/g, (match, inner) => {
      const trimmed = inner.trim();
      // Keep lone currency format like "$100" or "$25.50"
      if (/^\d+(?:[.,]\d+)?\s*(?:USD|EUR|RUB|k|m|b)?$/i.test(trimmed)) {
        return match;
      }
      return trimmed;
    });

    // Step 8: Restore preserved code blocks
    processed = processed.replace(/___CODE_BLOCK_(\d+)___/g, (_, index) => {
      return codeBlocks[parseInt(index, 10)] ?? '';
    });

    return processed;
  }
}
