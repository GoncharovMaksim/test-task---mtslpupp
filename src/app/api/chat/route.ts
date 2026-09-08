import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/container';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, sessionId = 'web_session_default', userId = 'web_user' } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required and must be a string' }, { status: 400 });
    }

    const response = await container.processChatMessageUseCase.execute({
      sessionId,
      userId,
      content,
      channel: 'web',
    });

    return NextResponse.json({
      success: true,
      message: response.responseMessage.toJSON(),
      latencyMs: response.latencyMs,
      tokensUsed: response.tokensUsed,
      model: response.model,
      provider: response.provider,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Chat completion failed',
      },
      { status: 500 }
    );
  }
}
