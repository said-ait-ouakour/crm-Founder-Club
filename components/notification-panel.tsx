"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useWebSocket } from '@/hooks/use-websocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  BellRing, 
  Mail, 
  Eye, 
  MousePointer, 
  MessageSquare,
  ExternalLink,
  X,
  Clock,
  User,
  Building2,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function NotificationPanel({ isOpen, onClose, className }: NotificationPanelProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [stableConnection, setStableConnection] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const { isConnected, notifications, clearNotifications } = useWebSocket({
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

  const getEventIcon = (eventType: string, status?: string) => {
    // Handle status-based icons first
    if (status) {
      switch (status) {
        case 'open':
          return <Mail className="h-4 w-4 text-blue-600" />
        case 'processed':
          return <Clock className="h-4 w-4 text-yellow-600" />
        case 'delivered':
          return <Mail className="h-4 w-4 text-green-600" />
        case 'not_delivered':
          return <Mail className="h-4 w-4 text-red-600" />
        case 'bounce':
          return <Mail className="h-4 w-4 text-orange-600" />
      }
    }
    
    // Handle event-based icons
    switch (eventType) {
      case 'opened':
        return <Eye className="h-4 w-4 text-blue-600" />
      case 'clicked':
        return <MousePointer className="h-4 w-4 text-green-600" />
      case 'replied':
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      case 'seen':
        return <Eye className="h-4 w-4 text-orange-600" />
      default:
        return <Mail className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventColor = (eventType: string, status?: string) => {
    // Handle status-based colors first
    if (status) {
      switch (status) {
        case 'open':
          return 'border-blue-200 bg-blue-50'
        case 'processed':
          return 'border-yellow-200 bg-yellow-50'
        case 'delivered':
          return 'border-green-200 bg-green-50'
        case 'not_delivered':
          return 'border-red-200 bg-red-50'
        case 'bounce':
          return 'border-orange-200 bg-orange-50'
      }
    }
    
    // Handle event-based colors
    switch (eventType) {
      case 'opened':
        return 'border-blue-200 bg-blue-50'
      case 'clicked':
        return 'border-green-200 bg-green-50'
      case 'replied':
        return 'border-purple-200 bg-purple-50'
      case 'seen':
        return 'border-orange-200 bg-orange-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const handleViewLead = (leadId: string) => {
    router.push(`/leads/${leadId}`)
    onClose()
  }

  const recentNotifications = notifications.slice(0, 10) // Show last 10 notifications

  if (!isOpen) return null

  return (
    <Card className={cn(
      "fixed top-16 right-4 z-50 w-96 shadow-lg border",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {stableConnection ? (
              <BellRing className="h-4 w-4 text-green-600" />
            ) : (
              <Bell className="h-4 w-4 text-gray-400" />
            )}
            Notifications
            <Badge variant="outline" className="text-xs">
              {notifications.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/notifications')}
              className="text-xs"
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              View All
            </Button>
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (notifications.length === 0) {
                  return
                }
                
                setIsClearing(true)
                try {
                  await clearNotifications()
                } catch (error) {
                  console.error('Error in clear notifications:', error)
                } finally {
                  setIsClearing(false)
                }
              }}
              disabled={isClearing}
              className="text-xs"
            >
              {isClearing ? 'Clearing...' : 'Clear All'}
            </Button> */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {recentNotifications.length > 0 ? (
            <div className="space-y-2 p-2">
              {recentNotifications.map((notification, index) => (
                <div
                  key={`${notification.leadId}-${notification.timestamp}-${index}`}
                  className={cn(
                    "p-3 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer",
                    getEventColor(notification.eventType, notification.status)
                  )}
                  onClick={() => handleViewLead(notification.leadId)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getEventIcon(notification.eventType, notification.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {notification.leadName}
                        </h4>
                      </div>
                      
                      {notification.businessName && (
                        <div className="flex items-center gap-1 mb-1">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-600 truncate">
                            {notification.businessName}
                          </span>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-6 px-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewLead(notification.leadId)
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 mb-1">No notifications yet</p>
              <p className="text-xs text-gray-400">
                Email activity will appear here
              </p>
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="border-t p-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{notifications.length} total notifications</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
