import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { broadcastToLead, broadcastToUser } from '../websocket/route'

interface EmailNotification {
  leadId: string
  eventType?: 'opened' | 'clicked' | 'replied' | 'seen'
  status?: 'open' | 'processed' | 'not_delivered' | 'bounce' | 'delivered' | 'reply'
  messageId?: string
  timestamp: string
  metadata?: {
    userAgent?: string
    ipAddress?: string
    linkClicked?: string
    replyContent?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const notification: EmailNotification = await request.json()

    console.log('Notification:', notification)
    
    
    // Validate required fields
    if (!notification.leadId || (!notification.eventType && !notification.status)) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId and either eventType or status' },
        { status: 400 }
      )
    }
    
    // Get lead information
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, contact_first_name, contact_last_name, business_name, current_status')
      .eq('id', notification.leadId)
      .single()
    
    if (leadError || !lead) {
      console.error('Lead not found:', leadError)
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }
    
    // Get all users who should receive this notification
    // 1. Users assigned to this lead via users_leads table
    const { data: assignedUsers, error: assignedUsersError } = await supabase
      .from('users_leads')
      .select(`
        user_id,
        users!inner(id, fullname, role)
      `)
      .eq('lead_id', notification.leadId)
    
    if (assignedUsersError) {
      console.error('Error fetching assigned users:', assignedUsersError)
    }
    
    // 2. Get all managers and admins (they see all notifications)
    const { data: managersAdmins, error: managersError } = await supabase
      .from('users')
      .select('id, fullname, role')
      .in('role', ['manager', 'admin'])
    
    if (managersError) {
      console.error('Error fetching managers/admins:', managersError)
    }
    
    // Combine assigned users and managers/admins
    const users = [
      ...(assignedUsers?.map(au => au.users).filter(Boolean) || []),
      ...(managersAdmins || [])
    ]
    
    console.log('Users who will receive notification:', users.map(u => ({ id: u.id, name: u.fullname, role: u.role })))
    
    // Remove duplicates based on user ID
    const uniqueUsers = users.filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id)
    )
    
    // Map external status to internal format
    let mappedNotification
    if (notification.status) {
      // External system sent status field
      console.log('Mapping from status field:', notification.status)
      mappedNotification = mapExternalStatusToInternal(notification.status)
    } else if (notification.eventType) {
      // External system sent eventType field - check if it's a status value
      console.log('Checking eventType for status values:', notification.eventType)
      if (['open', 'processed', 'not_delivered', 'bounce', 'delivered', 'reply'].includes(notification.eventType)) {
        // It's a status value sent as eventType
        console.log('Detected status value in eventType, mapping:', notification.eventType)
        mappedNotification = mapExternalStatusToInternal(notification.eventType)
      } else {
        // It's a regular event type
        console.log('Regular event type:', notification.eventType)
        mappedNotification = { eventType: notification.eventType, status: null, priority: 'event' as const }
      }
    } else {
      // Fallback
      console.log('Using fallback mapping')
      mappedNotification = { eventType: 'opened', status: null, priority: 'event' as const }
    }
    
    console.log('Mapped notification:', mappedNotification)

    // Create notification message
    const notificationMessage = {
      type: 'email_notification',
      leadId: notification.leadId,
      eventType: mappedNotification.eventType,
      status: mappedNotification.status,
      leadName: `${lead.contact_first_name} ${lead.contact_last_name}`,
      businessName: lead.business_name,
      leadStatus: lead.current_status,
      timestamp: notification.timestamp,
      metadata: notification.metadata,
      redirectUrl: `/leads/${notification.leadId}`,
      message: getNotificationMessage(mappedNotification.eventType, lead, mappedNotification.status)
    }
    
    // Broadcast to all connected clients viewing this lead
    const leadViewers = broadcastToLead(notification.leadId, notificationMessage)
    
    // Broadcast to all users (for dashboard notifications)
    let userNotifications = 0
    if (uniqueUsers) {
      for (const user of uniqueUsers) {
        userNotifications += broadcastToUser(user.id, notificationMessage)
      }
    }
    
    // Store notification in database for each user
    let storedNotifications = 0
    if (uniqueUsers && uniqueUsers.length > 0) {
      const notificationRecords = uniqueUsers.map(user => ({
        lead_id: notification.leadId,
        event_type: mappedNotification.eventType,
        status: mappedNotification.status,
        message_id: notification.messageId,
        metadata: notification.metadata,
        user_id: user.id,
        created_at: notification.timestamp
      }))
      
      const { error: storeError } = await supabase
        .from('email_notifications')
        .insert(notificationRecords)
      
      if (storeError) {
        console.error('Error storing notifications:', storeError)
      } else {
        storedNotifications = notificationRecords.length
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      leadViewers,
      userNotifications,
      storedNotifications,
      totalSent: leadViewers + userNotifications
    })
    
  } catch (error) {
    console.error('Error processing email notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// External status to internal mapping
function mapExternalStatusToInternal(externalStatus: string): {
  eventType: string
  status: string | null
  priority: 'status' | 'event'
} {
  const statusMap: Record<string, { eventType: string; status: string | null; priority: 'status' | 'event' }> = {
    'open': { eventType: 'opened', status: null, priority: 'event' },
    'processed': { eventType: 'status_update', status: 'processed', priority: 'status' },
    'not_delivered': { eventType: 'status_update', status: 'not_delivered', priority: 'status' },
    'bounce': { eventType: 'status_update', status: 'bounce', priority: 'status' },
    'delivered': { eventType: 'status_update', status: 'delivered', priority: 'status' },
    'reply': { eventType: 'status_update', status: 'reply', priority: 'status' }
  }
  
  return statusMap[externalStatus] || { eventType: 'status_update', status: externalStatus, priority: 'status' }
}

function getNotificationMessage(eventType: string, lead: any, status?: string): string {
  const leadName = `${lead.contact_first_name} ${lead.contact_last_name}`
  const businessName = lead.business_name ? ` (${lead.business_name})` : ''
  
  // Handle status-based messages first
  if (status) {
    switch (status) {
      case 'open':
        return `📬 ${leadName}${businessName} email is ready to be sent`
      case 'processed':
        return `⚙️ ${leadName}${businessName} email is being processed`
      case 'delivered':
        return `✅ ${leadName}${businessName} email has been delivered`
      case 'not_delivered':
        return `❌ ${leadName}${businessName} email could not be delivered`
      case 'bounce':
        return `🔄 ${leadName}${businessName} email bounced back`
      case 'reply':
        return `💬 ${leadName}${businessName} replied to your email`
    }
  }
  
  // Handle event-based messages
  switch (eventType) {
    case 'opened':
      return `📧 ${leadName}${businessName} opened your email`
    case 'clicked':
      return `🔗 ${leadName}${businessName} clicked a link in your email`
    case 'replied':
      return `💬 ${leadName}${businessName} replied to your email`
    case 'seen':
      return `👁️ ${leadName}${businessName} has seen your message`
    default:
      return `📧 ${leadName}${businessName} email activity update`
  }
}

// GET endpoint to retrieve notification history
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const leadId = url.searchParams.get('leadId')
    const userId = url.searchParams.get('userId')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    
    let query = supabase
      .from('email_notifications')
      .select(`
        *,
        leads(id, contact_first_name, contact_last_name, business_name, current_status)
      `)
      .eq('is_cleared', false) // Only show non-cleared notifications
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (leadId) {
      query = query.eq('lead_id', leadId)
    }
    
    // If userId is provided, filter based on user role
    if (userId) {
      // First get the user's database ID and role using the auth user_id (UUID)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('user_id', userId)
        .single()
      
      if (userError) {
        console.error('Error fetching user:', userError)
        // If user not found, show no notifications
        query = query.eq('user_id', -1) // This will return no results
      } else if (user) {
        // All users (including admins and managers) only see notifications assigned to them
        query = query.eq('user_id', user.id)
        console.log(`Filtering notifications for user ${user.id} (${user.role})`)
      } else {
        // If user not found, show no notifications
        query = query.eq('user_id', -1) // This will return no results
      }
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ notifications: data })
    
  } catch (error) {
    console.error('Error in GET /api/email-notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH endpoint to clear notifications (soft delete)
export async function PATCH(request: NextRequest) {
  try {
    const { notificationIds, userId } = await request.json()
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid notificationIds' },
        { status: 400 }
      )
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }
    
    // Get the user's database ID using the auth user_id (UUID)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    if (userError || !user) {
      console.error('Error fetching user for clear operation:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Update notifications to be cleared (soft delete) - only for this user's notifications
    const { data, error } = await supabase
      .from('email_notifications')
      .update({ is_cleared: true })
      .in('id', notificationIds)
      .eq('user_id', user.id) // Ensure user can only clear their own notifications
      .select('id')
    
    if (error) {
      console.error('Error clearing notifications:', error)
      return NextResponse.json(
        { error: 'Failed to clear notifications' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      clearedCount: data?.length || 0,
      message: 'Notifications cleared successfully' 
    })
    
  } catch (error) {
    console.error('Error in PATCH /api/email-notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
