import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300; // 5 minutes timeout
export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Style transfer is temporarily unavailable' },
    { status: 501 }
  );
} 