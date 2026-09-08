import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/container';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const result = await container.handleTelegramUpdateUseCase.execute(update);
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to process Telegram update' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const me = await container.telegramAdapter.getMe();
  return NextResponse.json({
    status: 'webhook_endpoint_ready',
    bot: me.result || null,
    channel: 'telegram',
  });
}
