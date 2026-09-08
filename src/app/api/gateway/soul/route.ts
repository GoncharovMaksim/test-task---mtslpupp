import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/container';

export async function GET() {
  try {
    const soul = await container.manageSoulUseCase.getActiveSoul();
    return NextResponse.json({
      name: soul.metadata.name,
      sections: soul.sections,
      rawMarkdown: soul.rawMarkdown,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to read SOUL persona' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { markdown } = body;
    if (!markdown) {
      return NextResponse.json({ error: 'markdown is required' }, { status: 400 });
    }

    const updated = await container.manageSoulUseCase.updateSoul(markdown);
    return NextResponse.json({
      success: true,
      name: updated.metadata.name,
      sectionsCount: updated.sections.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to update SOUL persona' },
      { status: 500 }
    );
  }
}
