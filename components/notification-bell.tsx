"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useWebSocket } from '@/hooks/use-websocket'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, BellRing } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  className?: string
  onClick?: () => void
}

export function NotificationBell({ className, onClick }: NotificationBellProps) {
  const { user } = useAuth()
  const [stableConnection, setStableConnection] = useState(false)
  const { isConnected, notifications } = useWebSocket({
    onNotification: (notification) => {
      // Handle new notification
    }
  })

  // Debounce connection status to prevent flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      setStableConnection(isConnected)
    }, 1000) // Wait 1 second before updating connection status

    return () => clearTimeout(timer)
  }, [isConnected])

  const unreadCount = notifications.filter(n => {
    // Consider notifications from the last 5 minutes as "unread"
    const notificationTime = new Date(n.timestamp).getTime()
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
    return notificationTime > fiveMinutesAgo
  }).length

  if (!user) return null

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn(
          "relative w-8 h-8 p-0",
          stableConnection ? "text-green-600" : "text-gray-400",
          className
        )}
      >
        {stableConnection ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
      
      {/* Connection status indicator */}
      <div className={cn(
        "absolute -bottom-1 -right-1 w-2 h-2 rounded-full",
        stableConnection ? "bg-green-500" : "bg-red-500"
      )} />
    </div>
  )
}
