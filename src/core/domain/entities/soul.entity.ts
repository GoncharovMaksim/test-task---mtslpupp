export interface SoulMetadata {
  name: string;
  version?: string;
  description?: string;
  author?: string;
}

export interface ParsedSoulSection {
  title: string;
  content: string;
}

export class SoulEntity {
  public readonly rawMarkdown: string;
  public readonly metadata: SoulMetadata;
  public readonly systemPrompt: string;
  public readonly sections: ParsedSoulSection[];

  constructor(params: {
    rawMarkdown: string;
    metadata?: SoulMetadata;
    systemPrompt: string;
    sections?: ParsedSoulSection[];
  }) {
    this.rawMarkdown = params.rawMarkdown;
    this.metadata = params.metadata || { name: 'OpenClaw Core Assistant' };
    this.systemPrompt = params.systemPrompt;
    this.sections = params.sections || [];
  }

  public getSection(title: string): string | undefined {
    const found = this.sections.find(
      (s) => s.title.toLowerCase() === title.toLowerCase()
    );
    return found?.content;
  }

  public toSystemInstruction(customVariables: Record<string, string> = {}): string {
    let instruction = this.systemPrompt;
    for (const [key, val] of Object.entries(customVariables)) {
      instruction = instruction.replaceAll(`{{${key}}}`, val);
    }
    return instruction;
  }
}
