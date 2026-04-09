"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWebSocket } from '@/hooks/use-websocket'
import { EmailNotificationToast } from '@/components/email-notification-toast'
import { useAuth } from '@/contexts/auth-context'

interface NotificationManagerProps {
  leadId?: string
  maxNotifications?: number
  autoCloseDelay?: number
}

export function NotificationManager({ 
  leadId, 
  maxNotifications = 3,
  autoCloseDelay = 8000 
}: NotificationManagerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [activeNotifications, setActiveNotifications] = useState<any[]>([])
  const [notificationQueue, setNotificationQueue] = useState<any[]>([])

  const { isConnected, notifications, clearNotifications } = useWebSocket({
    leadId,
    onNotification: (notification) => {
      console.log('New notification received:', notification)
      
      // Add to queue if we have too many active notifications
      if (activeNotifications.length >= maxNotifications) {
        setNotificationQueue(prev => [...prev, notification])
      } else {
        setActiveNotifications(prev => [...prev, notification])
      }
    }
  })

  // Process notification queue when space becomes available
  useEffect(() => {
    if (activeNotifications.length < maxNotifications && notificationQueue.length > 0) {
      const nextNotification = notificationQueue[0]
      setActiveNotifications(prev => [...prev, nextNotification])
      setNotificationQueue(prev => prev.slice(1))
    }
  }, [activeNotifications.length, maxNotifications, notificationQueue])

  const handleCloseNotification = (notificationId: string) => {
    setActiveNotifications(prev => 
      prev.filter(n => n.leadId !== notificationId)
    )
  }

  const handleViewLead = (leadId: string) => {
    router.push(`/leads/${leadId}`)
  }

  // Show connection status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('WebSocket connection status:', isConnected ? 'Connected' : 'Disconnected')
    }
  }, [isConnected])

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {activeNotifications.map((notification, index) => (
        <div 
          key={`${notification.leadId}-${notification.timestamp}-${index}`}
          className="animate-in slide-in-from-right-full"
          style={{ 
            animationDelay: `${index * 100}ms`,
            zIndex: 50 - index 
          }}
        >
          <EmailNotificationToast
            notification={notification}
            onClose={() => handleCloseNotification(notification.leadId)}
            onViewLead={handleViewLead}
            autoClose={true}
            autoCloseDelay={autoCloseDelay}
          />
        </div>
      ))}
      
      {/* Connection status indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-1 rounded text-xs">
          WS: {isConnected ? '🟢' : '🔴'} | Notifications: {notifications.length}
        </div>
      )}
    </div>
  )
}
