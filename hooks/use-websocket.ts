import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface WebSocketNotification {
  type: 'email_notification'
  leadId: string
  eventType: 'opened' | 'clicked' | 'replied' | 'seen'
  leadName: string
  businessName?: string
  leadStatus: string
  timestamp: string
  metadata?: any
  redirectUrl: string
  message: string
}

interface UseWebSocketOptions {
  leadId?: string
  onNotification?: (notification: WebSocketNotification) => void
  autoConnect?: boolean
}

export function useWebSocket({ 
  leadId, 
  onNotification, 
  autoConnect = true 
}: UseWebSocketOptions = {}) {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  // Simulate WebSocket connection using polling
  const connect = useCallback(async () => {
    if (!user?.id) {
      return
    }

    try {
      // Register client with the server
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          leadId: leadId || null,
          action: 'connect'
        })
      })

      if (response.ok) {
        setIsConnected(true)
        reconnectAttempts.current = 0
        
        // Start polling for notifications
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        
        // Initial fetch of all notifications
        const fetchAllNotifications = async () => {
          try {
            const notificationsResponse = await fetch(`/api/email-notifications?userId=${user.id}&limit=50`)
            if (notificationsResponse.ok) {
              const data = await notificationsResponse.json()
              if (data.notifications && data.notifications.length > 0) {
                const formattedNotifications = data.notifications.map((notification: any) => ({
                  id: notification.id,
                  type: 'email_notification',
                  leadId: notification.lead_id,
                  eventType: notification.event_type,
                  status: notification.status,
                  leadName: notification.leads?.contact_first_name && notification.leads?.contact_last_name 
                    ? `${notification.leads.contact_first_name} ${notification.leads.contact_last_name}`
                    : 'Unknown Lead',
                  businessName: notification.leads?.business_name,
                  leadStatus: notification.leads?.current_status || 'Unknown',
                  timestamp: notification.created_at,
                  metadata: notification.metadata,
                  redirectUrl: `/leads/${notification.lead_id}`,
                  message: getNotificationMessage(notification.event_type, notification.leads, notification.status)
                }))
                
                setNotifications(formattedNotifications)
              }
            }
          } catch (error) {
            console.error('Error fetching initial notifications:', error)
          }
        }

        // Fetch all notifications initially
        fetchAllNotifications()

        intervalRef.current = setInterval(async () => {
          try {
            // Poll for new notifications every 2 minutes
            const notificationsResponse = await fetch(`/api/email-notifications?userId=${user.id}&limit=5`)
            if (notificationsResponse.ok) {
              const data = await notificationsResponse.json()
              if (data.notifications && data.notifications.length > 0) {
                // Get the latest notification timestamp from the current state
                setNotifications(prev => {
                  const lastNotificationTime = prev.length > 0 
                    ? new Date(prev[0].timestamp).getTime() 
                    : 0
                  
                  // Check for new notifications
                  const newNotifications = data.notifications.filter((notification: any) => {
                    const notificationTime = new Date(notification.created_at).getTime()
                    return notificationTime > lastNotificationTime
                  })
                  
                        if (newNotifications.length > 0) {
                          const formattedNotifications = newNotifications.map((notification: any) => ({
                            id: notification.id,
                            type: 'email_notification',
                            leadId: notification.lead_id,
                            eventType: notification.event_type,
                            status: notification.status,
                            leadName: notification.leads?.contact_first_name && notification.leads?.contact_last_name 
                              ? `${notification.leads.contact_first_name} ${notification.leads.contact_last_name}`
                              : 'Unknown Lead',
                            businessName: notification.leads?.business_name,
                            leadStatus: notification.leads?.current_status || 'Unknown',
                            timestamp: notification.created_at,
                            metadata: notification.metadata,
                            redirectUrl: `/leads/${notification.lead_id}`,
                            message: getNotificationMessage(notification.event_type, notification.leads, notification.status)
                          }))
                    
                    // Call onNotification for each new notification
                    if (onNotification) {
                      formattedNotifications.forEach(notification => onNotification(notification))
                    }
                    
                    return [...formattedNotifications, ...prev.slice(0, 49)]
                  }
                  
                  return prev
                })
              }
            }
          } catch (error) {
            console.error('Error polling notifications:', error)
          }
        }, 30000) // Poll every 30 seconds
        
      } else {
        throw new Error('Failed to register WebSocket client')
      }
    } catch (error) {
      console.error('Error connecting to WebSocket:', error)
      setIsConnected(false)
      
      // Attempt to reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++
          connect()
        }, delay)
      }
    }
  }, [user?.id, leadId, onNotification])

  const disconnect = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (user?.id) {
      try {
        await fetch('/api/websocket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            leadId: leadId || null,
            action: 'disconnect'
          })
        })
      } catch (error) {
        console.error('Error disconnecting WebSocket:', error)
      }
    }
    
    setIsConnected(false)
  }, [user?.id, leadId])

  const sendMessage = useCallback((message: any) => {
    // In this implementation, we don't send messages back to server
    // This is just for compatibility
  }, [])

  const clearNotifications = useCallback(async () => {
    if (!user?.id) {
      return
    }

    try {
      const currentNotifications = notifications
      
      if (currentNotifications.length === 0) {
        return
      }

      const notificationIds = currentNotifications.map(n => n.id).filter(Boolean)
      
      if (notificationIds.length === 0) {
        setNotifications([])
        return
      }

      const response = await fetch('/api/email-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds,
          userId: user.id
        })
      })

      const responseData = await response.json()

      if (response.ok) {
        setNotifications([])
      } else {
        console.error('Failed to clear notifications:', responseData)
        setNotifications([])
      }
    } catch (error) {
      console.error('Error clearing notifications:', error)
      setNotifications([])
    }
  }, [user?.id])

  useEffect(() => {
    if (autoConnect && user?.id) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, user?.id])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    isConnected,
    notifications,
    connect,
    disconnect,
    sendMessage,
    clearNotifications: () => setNotifications([])
  }
}

// Helper function to generate notification messages
function getNotificationMessage(eventType: string, lead: any): string {
  const leadName = lead?.contact_first_name && lead?.contact_last_name 
    ? `${lead.contact_first_name} ${lead.contact_last_name}`
    : 'Unknown Lead'
  const businessName = lead?.business_name ? ` (${lead.business_name})` : ''
  
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
