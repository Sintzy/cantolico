import { NextRequest, NextResponse } from 'next/server';
import { logQuickAction, getUserInfoFromRequest } from '@/lib/user-action-logger';

export async function POST(req: NextRequest) {
  try {
    const userInfo = {
      userId: '1',
      userEmail: 'test@example.com',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent'
    };

    // Test log
    await logQuickAction('STAR_SONG', userInfo, true, {
      songId: 'test-song-id',
      songTitle: 'Test Song',
      test: 'database_save_test'
    });

    return NextResponse.json({ success: true, message: 'Test log created' });
  } catch (error) {
    console.error('Test log error:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}