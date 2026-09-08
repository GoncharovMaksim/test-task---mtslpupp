export interface GatewayConfig {
  port: number;
  nodeEnv: string;
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
    openaiApiKey?: string;
    openaiBaseUrl?: string;
  };
  soulFilePath: string;
}

export function loadGatewayConfig(): GatewayConfig {
  const allowedUsersStr = process.env.TELEGRAM_ALLOWED_USERS || '';
  const allowedUsers = allowedUsersStr
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || process.env.TG_TOKEN || '',
      allowedUsers,
      proxyUrl: process.env.TELEGRAM_PROXY_URL || 'socks5://baFwqZ:Sq51aK@104.238.190.248:11024',
      apiBase: process.env.TELEGRAM_API_BASE || 'https://api.telegram.org',
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    },
    llm: {
      provider: (process.env.DEFAULT_LLM_PROVIDER as any) || 'groq',
      groqApiKey: process.env.GROQ_API_KEY || '',
      groqModel: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiBaseUrl: process.env.OPENAI_BASE_URL,
    },
    soulFilePath: process.env.SOUL_FILE_PATH || './SOUL.md',
  };
}
