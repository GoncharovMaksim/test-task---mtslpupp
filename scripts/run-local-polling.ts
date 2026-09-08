import { container } from '../src/infrastructure/container';

async function main() {
  console.log('=== OpenClaw Gateway: Starting Standalone Local Polling Worker ===');
  const me = await container.telegramAdapter.getMe();

  if (!me.ok) {
    console.error('Failed to connect to Telegram Bot API:', me.description);
    console.log('Ensure SOCKS5 proxy or TELEGRAM_BOT_TOKEN is properly configured.');
    process.exit(1);
  }

  console.log(`Telegram Bot authenticated: @${me.result.username} (ID: ${me.result.id})`);
  console.log(`Active SOUL persona loaded from: ${container.config.soulFilePath}`);
  console.log(`LLM Provider active: ${container.llmProvider.providerName} (${container.config.llm.groqModel})`);
  console.log('Testing network connectivity...');

  const diagnostics = await container.testConnectivityUseCase.execute();
  console.log('Telegram API status:', diagnostics.telegramStatus.status, `(${diagnostics.telegramStatus.latencyMs}ms)`);
  console.log('LLM Provider status:', diagnostics.llmStatus.status, `(${diagnostics.llmStatus.latencyMs}ms)`);
  console.log('Gateway is listening for incoming updates. Press Ctrl+C to terminate.');

  let offset = 0;
  let isRunning = true;

  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
    isRunning = false;
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
    isRunning = false;
  });

  while (isRunning) {
    try {
      const updates = await container.telegramAdapter.getUpdates(offset, 20);
      for (const update of updates) {
        offset = update.update_id + 1;
        await container.handleTelegramUpdateUseCase.execute(update);
      }
    } catch (err: any) {
      if (isRunning) {
        console.error('Polling loop warning:', err?.message || err);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  console.log('OpenClaw polling worker terminated.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in polling worker:', err);
  process.exit(1);
});
