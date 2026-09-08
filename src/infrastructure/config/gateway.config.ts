export interface GatewayConfig {
  port: number;
  nodeEnv: string;
  proxyUrl?: string;
  telegram: {
    botToken: string;
    allowedUsers: number[];
    proxyUrl?: string;
    apiBase: string;
    webhookUrl?: string;
  };
  llm: {
    provider: 'groq' | 'openai' | 'openrouter';
    groqApiKey: string;
    groqModel: string;
    openrouterApiKey?: string;
    geminiApiKey?: string;
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    proxyUrl?: string;
  };
  soulFilePath: string;
}

function normalizeProxyUrl(raw?: string): string | undefined {
  if (!raw || !raw.trim()) return undefined;
  const trimmed = raw.trim();
  if (['direct', 'none', 'off', '0', ''].includes(trimmed.toLowerCase())) {
    return undefined;
  }
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('socks5://') ||
    trimmed.startsWith('socks://')
  ) {
    return trimmed;
  }
  // host:port:user:pass format
  const parts = trimmed.split(':');
  if (parts.length === 4) {
    return `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
  }
  if (parts.length === 2) {
    return `http://${parts[0]}:${parts[1]}`;
  }
  return trimmed;
}

export function loadGatewayConfig(): GatewayConfig {
  const allowedUsersStr = process.env.TELEGRAM_ALLOWED_USERS || '';
  const allowedUsers = allowedUsersStr
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  const resolvedProxy = normalizeProxyUrl(
    process.env.TELEGRAM_PROXY_URL ||
    process.env.PROXY_URL ||
    process.env.SANDBOX_PROXY ||
    process.env.TG_PROXY_LIST
  );

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    proxyUrl: resolvedProxy,
    telegram: {
      botToken:
        process.env.TELEGRAM_BOT_TOKEN ||
        process.env.TG_TOKEN ||
        '',
      allowedUsers,
      proxyUrl: resolvedProxy,
      apiBase: process.env.TELEGRAM_API_BASE || 'https://api.telegram.org',
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    },
    llm: {
      provider: (process.env.DEFAULT_LLM_PROVIDER as any) || 'groq',
      groqApiKey:
        process.env.GROQ_API_KEY ||
        process.env.SANDBOX_GROQ_API_KEY ||
        '',
      groqModel: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
      openrouterApiKey:
        process.env.OPENROUTER_API_KEY ||
        process.env.SANDBOX_OPENROUTER_API_KEY,
      geminiApiKey:
        process.env.GEMINI_API_KEY ||
        process.env.SANDBOX_GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiBaseUrl: process.env.OPENAI_BASE_URL,
      proxyUrl: resolvedProxy,
    },
    soulFilePath: process.env.SOUL_FILE_PATH || './SOUL.md',
  };
}

