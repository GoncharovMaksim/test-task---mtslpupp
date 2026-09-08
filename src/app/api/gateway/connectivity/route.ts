import { NextResponse } from 'next/server';
import { container } from '@/infrastructure/container';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const diagnostics = await container.testConnectivityUseCase.execute();
    return NextResponse.json(diagnostics);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Connectivity check failed' },
      { status: 500 }
    );
  }
}
