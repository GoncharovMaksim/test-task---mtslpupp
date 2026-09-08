import { container } from '../src/infrastructure/container';

async function main() {
  console.log('=== OpenClaw Gateway: Starting Standalone Local Polling Worker ===');
  const me = await container.telegramAdapter.getMe();

  if (!me.ok) {
    console.error('Failed to connect to Telegram Bot API:', me.description);
    console.log('Ensure proxy or TELEGRAM_BOT_TOKEN is properly configured.');
    process.exit(1);
  }

  console.log(`Telegram Bot authenticated: @${me.result.username} (ID: ${me.result.id})`);
  console.log(`Active SOUL persona loaded from: ${container.config.soulFilePath}`);
  console.log(`LLM Provider active: ${container.llmProvider.providerName} (${container.config.llm.groqModel})`);
  console.log('Testing network connectivity...');

  const diagnostics = await container.testConnectivityUseCase.execute();
  console.log('Telegram API status:', diagnostics.telegramStatus.status, `(${diagnostics.telegramStatus.latencyMs}ms)`);
  console.log('LLM Provider status:', diagnostics.llmStatus.status, `(${diagnostics.llmStatus.latencyMs}ms)`);

  // Webhook collision detection and automatic fallback management
  const webhookInfo = await container.telegramAdapter.getWebhookInfo();
  let productionWebhookUrl: string | undefined;

  if (webhookInfo.ok && webhookInfo.result?.url) {
    productionWebhookUrl = webhookInfo.result.url;
    console.log(`\n[Notice] Telegram Webhook is currently active pointing to: ${productionWebhookUrl}`);
    console.log('[Notice] In normal mode, the bot already processes messages 24/7 on Vercel without a local machine.');
    console.log('[Switch] Temporarily unregistering webhook to allow local polling session...');
    await container.telegramAdapter.deleteWebhook();
    console.log('[Switch] Webhook paused. Polling worker active.');
  }

  console.log('Gateway is listening for incoming updates. Press Ctrl+C to terminate.\n');

  let offset = 0;
  let isRunning = true;

  const shutdown = async () => {
    if (!isRunning) return;
    isRunning = false;
    console.log('\nShutting down polling worker gracefully...');

    if (productionWebhookUrl) {
      console.log(`[Restore] Re-activating 24/7 production webhook on Vercel: ${productionWebhookUrl}`);
      try {
        await container.telegramAdapter.setWebhook(productionWebhookUrl);
        console.log('[Restore] Production webhook successfully restored.');
      } catch (err: any) {
        console.error('[Restore Error] Failed to restore webhook:', err?.message);
      }
    }

    console.log('OpenClaw polling worker terminated.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (isRunning) {
    try {
      const updates = await container.telegramAdapter.getUpdates(offset, 20);
      for (const update of updates) {
        offset = update.update_id + 1;
        const msg = update.message;
        if (msg?.text) {
          const userTag = msg.from?.username ? `@${msg.from.username}` : `ID:${msg.from?.id || msg.chat.id}`;
          console.log(`[${new Date().toLocaleTimeString()}] [Incoming #${update.update_id}] from ${userTag} (chat ${msg.chat.id}): "${msg.text}"`);
          const result = await container.handleTelegramUpdateUseCase.execute(update);
          if (result.handled) {
            console.log(`[${new Date().toLocaleTimeString()}] [Handled #${update.update_id}] Action: ${result.action}`);
          } else if (result.error) {
            console.error(`[${new Date().toLocaleTimeString()}] [Error #${update.update_id}]: ${result.error}`);
          }
        } else {
          await container.handleTelegramUpdateUseCase.execute(update);
        }
      }
    } catch (err: any) {
      if (isRunning) {
        console.error('Polling loop warning:', err?.message || err);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal error in polling worker:', err);
  process.exit(1);
});
