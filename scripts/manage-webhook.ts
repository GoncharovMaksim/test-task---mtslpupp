import { container } from '../src/infrastructure/container';

const DEFAULT_VERCEL_WEBHOOK = 'https://test-task-vibecoder-mtslpupp.vercel.app/api/telegram/webhook';

async function main() {
  const action = process.argv[2] || 'info';
  const targetUrl = process.argv[3] || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/telegram/webhook` : DEFAULT_VERCEL_WEBHOOK);

  console.log(`=== OpenClaw Gateway: Webhook Manager (${action.toUpperCase()}) ===`);
  const me = await container.telegramAdapter.getMe();
  if (!me.ok) {
    console.error('Failed to authenticate with Telegram:', me.description);
    process.exit(1);
  }
  console.log(`Bot: @${me.result?.username} (ID: ${me.result?.id})`);

  if (action === 'info' || action === 'status') {
    const info = await container.telegramAdapter.getWebhookInfo();
    console.log('Webhook info:', JSON.stringify(info.result, null, 2));
    if (info.result?.url) {
      console.log(`\nStatus: ACTIVE -> ${info.result.url}`);
      console.log('The bot is operating 24/7 in serverless mode on Vercel.');
    } else {
      console.log('\nStatus: INACTIVE (No webhook configured)');
      console.log('Run "npm run webhook:set" to enable 24/7 Vercel processing.');
    }
  } else if (action === 'set') {
    console.log(`Setting webhook URL to: ${targetUrl}`);
    const success = await container.telegramAdapter.setWebhook(targetUrl);
    if (success) {
      console.log('Webhook successfully registered! The bot is now listening 24/7 on Vercel.');
    } else {
      console.error('Failed to register webhook.');
      process.exit(1);
    }
    const updated = await container.telegramAdapter.getWebhookInfo();
    console.log('Updated status:', updated.result?.url || 'Failed to verify');
  } else if (action === 'delete' || action === 'drop') {
    console.log('Deleting Telegram webhook...');
    const success = await container.telegramAdapter.deleteWebhook();
    if (success) {
      console.log('Webhook removed. Bot can now receive updates via local polling.');
    } else {
      console.error('Failed to delete webhook.');
      process.exit(1);
    }
  } else {
    console.log('Unknown action. Supported: info | set | delete');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Webhook manager error:', err);
  process.exit(1);
});
