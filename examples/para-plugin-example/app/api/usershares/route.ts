import { NextResponse } from 'next/server';
import { getAllUserShares } from '@/lib/usershare/actions';

export async function GET() {
  try {
    const userShares = await getAllUserShares();
    return NextResponse.json(userShares);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve user shares' },
      { status: 500 }
    );
  }
} 