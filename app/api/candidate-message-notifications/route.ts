import { NextRequest, NextResponse } from 'next/server';
import { candidateMessageNotifications } from '@/lib/candidate-message-notifications-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get notifications for this user from in-memory store
    const notifications = candidateMessageNotifications.get(userId) || [];

    // Return limited number of notifications, sorted by timestamp (newest first)
    const sortedNotifications = notifications
      .sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' 
          ? new Date(a.timestamp).getTime() 
          : (a.timestamp * 1000);
        const timeB = typeof b.timestamp === 'string' 
          ? new Date(b.timestamp).getTime() 
          : (b.timestamp * 1000);
        return timeB - timeA;
      })
      .slice(0, limit);

    return NextResponse.json({
      notifications: sortedNotifications,
      count: sortedNotifications.length,
      total: notifications.length
    });

  } catch (error) {
    console.error('Error fetching candidate message notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
