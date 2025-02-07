import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Setting to maximum allowed for hobby plan
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Style transfer is temporarily unavailable' },
    { status: 501 }
  );
} 