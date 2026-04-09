import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastToUser } from '@/app/api/websocket/route';
import { candidateMessageNotifications } from '@/lib/candidate-message-notifications-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateId, status, messageId, timestamp, metadata } = body;

    // Validate required fields
    if (!candidateId || !status || !messageId || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: candidateId, status, messageId, timestamp' },
        { status: 400 }
      );
    }

    // Look up candidate (read-only, no database write)
    const supabase = await createClient();
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, full_name, recruiter')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error('Error fetching candidate:', candidateError);
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Get ALL users with recruiter role (not just the assigned recruiter)
    const { data: recruiterUsers, error: recruiterError } = await supabase
      .from('users')
      .select('user_id, fullname, role')
      .eq('role', 'recruiter');

    if (recruiterError) {
      console.error('Error fetching recruiters:', recruiterError);
      return NextResponse.json(
        { error: 'Failed to fetch recruiters' },
        { status: 500 }
      );
    }

    if (!recruiterUsers || recruiterUsers.length === 0) {
      return NextResponse.json(
        { error: 'No recruiters found' },
        { status: 404 }
      );
    }

    // Extract all recruiter user_ids
    const recruiterUserIds = recruiterUsers
      .map(user => user.user_id)
      .filter((id): id is string => id !== null && id !== undefined);

    if (recruiterUserIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid recruiter user IDs found' },
        { status: 404 }
      );
    }

    console.log(`Sending notification to ${recruiterUserIds.length} recruiters:`, recruiterUsers.map(u => u.fullname || u.user_id));

    // Convert timestamp to ISO string format
    let timestampISO: string;
    if (typeof timestamp === 'string') {
      // Check if it's a numeric string (Unix timestamp)
      const numericTimestamp = Number(timestamp);
      if (!isNaN(numericTimestamp) && numericTimestamp > 0) {
        // It's a numeric string, convert from Unix timestamp to ISO
        timestampISO = new Date(numericTimestamp * 1000).toISOString();
      } else {
        // Try to parse as ISO string directly
        const parsed = new Date(timestamp);
        timestampISO = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
      }
    } else if (typeof timestamp === 'number') {
      // It's a number, convert from Unix timestamp to ISO
      timestampISO = new Date(timestamp * 1000).toISOString();
    } else {
      // Fallback to current time
      timestampISO = new Date().toISOString();
    }

    // Create notification object with unique ID that includes createdAt to ensure uniqueness
    const createdAtISO = new Date().toISOString();
    const notification = {
      id: `candidate_msg_${candidateId}_${messageId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'candidate_message_notification',
      candidateId: candidateId.toString(),
      candidateName: candidate.full_name || 'Unknown Candidate',
      status,
      messageId,
      timestamp: timestampISO,
      metadata: metadata || {},
      replyContent: metadata?.replyContent || '',
      redirectUrl: `/candidates/${candidateId}`,
      message: `${candidate.full_name || 'A candidate'} replied to your message`,
      createdAt: createdAtISO,
    };

    // Store notification in memory for ALL recruiters
    let totalBroadcastCount = 0;
    const recruiterResults = recruiterUserIds.map(recruiterUserId => {
      // Store notification for this recruiter
      const existingNotifications = candidateMessageNotifications.get(recruiterUserId) || [];
      candidateMessageNotifications.set(recruiterUserId, [notification, ...existingNotifications]);

      // Broadcast to this recruiter via WebSocket
      const broadcastCount = broadcastToUser(recruiterUserId, notification);
      totalBroadcastCount += broadcastCount;

      return {
        recruiterUserId,
        broadcastCount
      };
    });

    console.log(`Candidate message notification created for ${recruiterUserIds.length} recruiters, total broadcast to ${totalBroadcastCount} clients`);

    return NextResponse.json({
      success: true,
      notification,
      recruiterUserIds,
      recruiterCount: recruiterUserIds.length,
      totalBroadcastCount,
      recruiterResults,
      message: 'Notification sent successfully to all recruiters'
    });

  } catch (error) {
    console.error('Error processing candidate message notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
