import { NextResponse } from 'next/server';
import { container } from '@/infrastructure/container';

export async function GET() {
  try {
    const status = await container.getGatewayStatusUseCase.execute();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch gateway status' },
      { status: 500 }
    );
  }
}
